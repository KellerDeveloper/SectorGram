import http from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { connectDatabase } from "./config/database.js";
import { getSocketCorsOptions } from "./config/cors.js";
import { authMiddleware as authMiddlewareExternal } from "./middleware/authMiddleware.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createApp } from "./app.js";
import User from "./models/User.js";
import Chat from "./models/Chat.js";
import Message from "./models/Message.js";

dotenv.config();

const { PORT = 4000, JWT_SECRET } = process.env;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not set. Please configure it in your environment (.env or hosting settings)."
  );
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Отслеживание онлайн-статуса: userId -> Set of socketIds
const onlineUsers = new Map(); // userId -> Set<socketId>
// Отслеживание комнат: userId -> Set of chatIds
const userRooms = new Map(); // userId -> Set<chatId>

const app = createApp();
// Делаем некоторые структуры и утилиты доступными для HTTP-слоя (контроллеров/сервисов)
app.locals.onlineUsers = onlineUsers;
app.locals.chatHelpers = {
  getOnlineUsers,
  isUserOnline,
};
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: getSocketCorsOptions(),
});

// Отправка push-уведомления через Expo
async function sendExpoPushNotification({ to, title, body, data = {} }) {
  try {
    if (!to || !to.startsWith("ExponentPushToken")) {
      return;
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        to,
        sound: "default",
        title,
        body,
        data,
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      console.error("Expo push error:", json);
    }
  } catch (error) {
    console.error("Ошибка отправки Expo push:", error);
  }
}

// Управление онлайн-статусом
function markUserOnline(userId, socketId) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
}

function markUserOffline(userId, socketId) {
  const sockets = onlineUsers.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      onlineUsers.delete(userId);
    }
  }
}

function isUserOnline(userId) {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

function getOnlineUsers(userIds) {
  return userIds.filter((id) => isUserOnline(id.toString()));
}

// Уведомление о изменении статуса пользователя
async function notifyUserStatusChange(userId, isOnline, chatIds = []) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const statusEvent = {
      userId: user._id.toString(),
      isOnline,
      user: { id: user._id.toString(), name: user.name, email: user.email },
      timestamp: new Date().toISOString(),
    };

    // Уведомляем все комнаты, где есть этот пользователь
    chatIds.forEach((chatId) => {
      io.to(`chat:${chatId}`).emit("user_status_change", statusEvent);
    });

    // Также уведомляем всех друзей/контактов (можно расширить)
    io.emit("user_status_change", statusEvent);
  } catch (error) {
    console.error("Ошибка при уведомлении о статусе:", error);
  }
}

// Временная прокладка: сохраняем исходное имя authMiddleware,
// но реализацию берём из middleware/authMiddleware, чтобы постепенно
// перевести всё на модульный подход.
const authMiddleware = authMiddlewareExternal;

// Удалить сообщение
app.delete("/messages/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;
    const mongoose = (await import("mongoose")).default;

    const message = await Message.findById(new mongoose.Types.ObjectId(messageId));
    if (!message) {
      return res.status(404).json({ error: "Сообщение не найдено" });
    }

    if (message.authorId.toString() !== userId) {
      return res.status(403).json({ error: "Можно удалять только свои сообщения" });
    }

    message.deletedAt = new Date();
    await message.save();

    res.json({ success: true });

    // Уведомляем всех участников чата об удалении
    io.to(`chat:${message.chatId.toString()}`).emit("message_deleted", {
      id: message._id.toString(),
      chatId: message.chatId.toString(),
    });
  } catch (error) {
    console.error("Ошибка удаления сообщения:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Отметить сообщения как прочитанные
app.post("/chats/:id/read", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.id;
    const mongoose = (await import("mongoose")).default;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Чат не найден" });
    }

    const memberIds = chat.members.map((m) => m.toString());
    if (!memberIds.includes(userId)) {
      return res.status(403).json({ error: "Нет доступа к этому чату" });
    }

    // Отмечаем все непрочитанные сообщения как прочитанные
    const unreadMessages = await Message.find({
      chatId: new mongoose.Types.ObjectId(chatId),
      authorId: { $ne: new mongoose.Types.ObjectId(userId) },
      readBy: { $not: { $elemMatch: { userId: new mongoose.Types.ObjectId(userId) } } },
    });

    for (const msg of unreadMessages) {
      msg.readBy.push({
        userId: new mongoose.Types.ObjectId(userId),
        readAt: new Date(),
      });
      msg.status = "read";
      await msg.save();
    }

    // Обнуляем счетчик непрочитанных
    if (chat.unreadCount) {
      chat.unreadCount.set(userId, 0);
      await chat.save();
    }

    res.json({ success: true });

    // Уведомляем отправителей о прочтении
    io.to(`chat:${chatId}`).emit("messages_read", {
      chatId,
      userId,
      messageIds: unreadMessages.map((m) => m._id.toString()),
    });
  } catch (error) {
    console.error("Ошибка отметки прочтения:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Получить онлайн-статус пользователей в чате
app.get("/chats/:id/online", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId).populate("members", "name email");
    if (!chat) {
      return res.status(404).json({ error: "Чат не найден" });
    }

    const memberIds = chat.members.map((m) => m._id.toString());
    if (!memberIds.includes(userId)) {
      return res.status(403).json({ error: "Нет доступа к этому чату" });
    }

    const onlineMemberIds = getOnlineUsers(memberIds);
    const onlineMembers = chat.members
      .filter((m) => onlineMemberIds.includes(m._id.toString()))
      .map((m) => ({
        id: m._id.toString(),
        name: m.name,
        email: m.email,
      }));

    res.json({
      chatId,
      onlineCount: onlineMembers.length,
      totalCount: chat.members.length,
      onlineMembers,
    });
  } catch (error) {
    console.error("Ошибка получения онлайн-статуса:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Получить онлайн-статус конкретных пользователей
app.post("/users/online-status", authMiddleware, (req, res) => {
  const { userIds } = req.body || {};
  if (!Array.isArray(userIds)) {
    return res.status(400).json({ error: "userIds должен быть массивом" });
  }

  const statuses = userIds.map((id) => ({
    userId: id,
    isOnline: isUserOnline(id),
  }));

  res.json({ statuses });
});

// Получить список всех онлайн пользователей
app.get("/users/online", authMiddleware, async (req, res) => {
  try {
    const onlineIds = Array.from(onlineUsers.keys());
    const users = await User.find({ _id: { $in: onlineIds } }).select("name email avatar");

    const onlineUsersList = users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isOnline: true,
    }));

    res.json({
      count: onlineUsersList.length,
      users: onlineUsersList,
    });
  } catch (error) {
    console.error("Ошибка получения онлайн пользователей:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Поиск пользователей
app.get("/users/search", authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id;

    if (!q || q.trim().length < 2) {
      return res.json({ users: [] });
    }

    const searchQuery = q.trim();
    const mongoose = (await import("mongoose")).default;

    // Ищем пользователей по имени или email (исключая текущего)
    const users = await User.find({
      _id: { $ne: new mongoose.Types.ObjectId(currentUserId) },
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
        { username: { $regex: searchQuery, $options: "i" } },
      ],
    })
      .select("name email avatar username")
      .limit(20);

    const usersList = users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      username: user.username,
      isOnline: isUserOnline(user._id.toString()),
    }));

    res.json({ users: usersList });
  } catch (error) {
    console.error("Ошибка поиска пользователей:", error);
    res.status(500).json({ error: "Ошибка сервера при поиске" });
  }
});

// Получить текущего пользователя
app.get("/users/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const mongoose = (await import("mongoose")).default;
    const user = await User.findById(new mongoose.Types.ObjectId(userId));

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Ошибка получения профиля:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Обновить профиль пользователя
app.put("/users/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, username, bio, avatar } = req.body || {};
    const mongoose = (await import("mongoose")).default;

    const user = await User.findById(new mongoose.Types.ObjectId(userId));
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Обновляем поля
    if (name !== undefined && name !== null) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ error: "Имя не может быть пустым" });
      }
      user.name = trimmedName;
    }
    
    if (username !== undefined && username !== null) {
      const trimmedUsername = String(username).trim().toLowerCase();
      // Если username пустой, удаляем его
      if (!trimmedUsername) {
        user.username = null;
      } else if (trimmedUsername !== user.username) {
        // Проверяем уникальность username
        const existing = await User.findOne({ username: trimmedUsername });
        if (existing && existing._id.toString() !== userId) {
          return res.status(409).json({ error: "Этот username уже занят" });
        }
        user.username = trimmedUsername;
      }
    }
    
    if (bio !== undefined) {
      user.bio = bio && String(bio).trim() ? String(bio).trim() : null;
    }
    
    if (avatar !== undefined) {
      user.avatar = avatar && String(avatar).trim() ? String(avatar).trim() : null;
    }

    await user.save();

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
    });
  } catch (error) {
    console.error("Ошибка обновления профиля:", error);
    res.status(500).json({ error: "Ошибка сервера при обновлении профиля" });
  }
});

// ===== Socket.io =====
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Токен не передан"));
  }
  try {
    const user = jwt.verify(token, JWT_SECRET);
    socket.user = user;
    next();
  } catch (e) {
    next(new Error("Невалидный токен"));
  }
});

io.on("connection", async (socket) => {
  const user = socket.user;
  const userId = user.id;
  const socketId = socket.id;

  console.log(`Socket connected: userId=${userId}, socketId=${socketId}`);

  // Присоединяем к персональной комнате для обновлений чатов
  socket.join(`user:${userId}`);

  // Отмечаем пользователя как онлайн
  const wasOffline = !isUserOnline(userId);
  markUserOnline(userId, socketId);

  // Если пользователь только что появился онлайн, уведомляем
  if (wasOffline) {
    try {
      // Находим все чаты пользователя
      const mongoose = (await import("mongoose")).default;
      const userChats = await Chat.find({
        members: new mongoose.Types.ObjectId(userId),
      });
      const userChatIds = userChats.map((c) => c._id.toString());

      // Уведомляем о появлении онлайн
      await notifyUserStatusChange(userId, true, userChatIds);

      // Автоматически присоединяем к комнатам всех чатов пользователя
      userChatIds.forEach((chatId) => {
        socket.join(`chat:${chatId}`);
      });

      // Сохраняем информацию о комнатах пользователя
      if (!userRooms.has(userId)) {
        userRooms.set(userId, new Set());
      }
      userChatIds.forEach((chatId) => {
        userRooms.get(userId).add(chatId);
      });
    } catch (error) {
      console.error("Ошибка при подключении пользователя:", error);
    }
  }

  // Клиент может явно присоединяться к комнатам чатов
  socket.on("join_chat", async (chatId) => {
    try {
      const mongoose = (await import("mongoose")).default;
      const chat = await Chat.findById(chatId);
      if (!chat) {
        socket.emit("error", { message: "Чат не найден" });
        return;
      }

      const memberIds = chat.members.map((m) => m.toString());
      if (!memberIds.includes(userId)) {
        socket.emit("error", { message: "Нет доступа к этому чату" });
        return;
      }

      socket.join(`chat:${chatId}`);

      // Сохраняем информацию о комнате
      if (!userRooms.has(userId)) {
        userRooms.set(userId, new Set());
      }
      userRooms.get(userId).add(chatId);

      // Уведомляем других участников чата о присоединении
      socket.to(`chat:${chatId}`).emit("user_joined_chat", {
        userId,
        chatId,
        user: { id: user.id, name: user.name, email: user.email },
        timestamp: new Date().toISOString(),
      });

      // Отправляем список онлайн пользователей в чате
      const onlineInChat = getOnlineUsers(memberIds);
      socket.emit("chat_online_users", {
        chatId,
        onlineUsers: onlineInChat,
      });
    } catch (error) {
      console.error("Ошибка при присоединении к чату:", error);
      socket.emit("error", { message: "Ошибка сервера" });
    }
  });

  socket.on("leave_chat", (chatId) => {
    socket.leave(`chat:${chatId}`);

    // Удаляем из отслеживания комнат
    const rooms = userRooms.get(userId);
    if (rooms) {
      rooms.delete(chatId);
    }

    // Уведомляем других участников чата о выходе
    socket.to(`chat:${chatId}`).emit("user_left_chat", {
      userId,
      chatId,
      timestamp: new Date().toISOString(),
    });
  });

  // Запрос списка онлайн пользователей в чате
  socket.on("get_chat_online", async (chatId) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        socket.emit("error", { message: "Чат не найден" });
        return;
      }

      const memberIds = chat.members.map((m) => m.toString());
      if (!memberIds.includes(userId)) {
        socket.emit("error", { message: "Нет доступа к этому чату" });
        return;
      }

      const onlineInChat = getOnlineUsers(memberIds);
      socket.emit("chat_online_users", {
        chatId,
        onlineUsers: onlineInChat,
      });
    } catch (error) {
      console.error("Ошибка при получении онлайн пользователей:", error);
      socket.emit("error", { message: "Ошибка сервера" });
    }
  });

  socket.on("send_message", async ({ chatId, text, replyTo, media }) => {
    try {
      const mongoose = (await import("mongoose")).default;
      const chat = await Chat.findById(chatId);
      if (!chat) {
        socket.emit("error", { message: "Чат не найден" });
        return;
      }

      const memberIds = chat.members.map((m) => m.toString());
      if (!memberIds.includes(userId)) {
        socket.emit("error", { message: "Нет доступа к этому чату" });
        return;
      }

      // Текст или медиа должны быть
      if ((!text || typeof text !== "string" || !text.trim()) && !media) {
        socket.emit("error", { message: "Текст или медиа обязательны" });
        return;
      }

      // Сохраняем сообщение в БД
      const messageData = {
        chatId: new mongoose.Types.ObjectId(chatId),
        authorId: new mongoose.Types.ObjectId(userId),
        text: text?.trim() || null,
        status: "sent",
      };

      if (replyTo) {
        messageData.replyTo = new mongoose.Types.ObjectId(replyTo);
      }

      if (media) {
        messageData.media = media;
      }

      const message = new Message(messageData);
      await message.save();

      // Обновляем последнее сообщение в чате
      chat.lastMessage = message._id;
      chat.lastMessageAt = new Date();
      
      // Увеличиваем счетчик непрочитанных для всех кроме отправителя
      if (!chat.unreadCount) {
        chat.unreadCount = new Map();
      }
      memberIds.forEach((memberId) => {
        if (memberId !== userId) {
          const current = chat.unreadCount.get(memberId) || 0;
          chat.unreadCount.set(memberId, current + 1);
        }
      });
      await chat.save();

      // Загружаем автора и replyTo для отправки клиентам
      await message.populate("authorId", "name email");
      if (replyTo) {
        const replyMsg = await Message.findById(replyTo).populate("authorId", "name");
        message.replyTo = replyMsg;
      }

      const messagePayload = {
        id: message._id.toString(),
        chatId: message.chatId.toString(),
        authorId: message.authorId._id.toString(),
        text: message.text,
        createdAt: message.createdAt,
        editedAt: message.editedAt,
        status: message.status,
        media: message.media,
        reactions: message.reactions?.map((r) => ({
          emoji: r.emoji,
          count: r.userIds.length,
        })) || [],
        author: {
          id: message.authorId._id.toString(),
          name: message.authorId.name,
          email: message.authorId.email,
        },
      };

      if (message.replyTo) {
        messagePayload.replyTo = {
          id: message.replyTo._id.toString(),
          text: message.replyTo.text,
          author: {
            id: message.replyTo.authorId._id.toString(),
            name: message.replyTo.authorId.name,
          },
        };
      }

      messagePayload.reactions = message.reactions?.map((r) => ({
        emoji: r.emoji,
        count: r.userIds.length,
      })) || [];

      // Отправляем всем участникам чата
      io.to(`chat:${chatId}`).emit("new_message", messagePayload);

      // Отправляем push-уведомления участникам (кроме отправителя)
      try {
        const recipients = await User.find({
          _id: { $in: memberIds.filter((id) => id !== userId) },
          expoPushToken: { $exists: true, $ne: null },
        }).select("expoPushToken name");

        await Promise.all(
          recipients.map((recipient) =>
            sendExpoPushNotification({
              to: recipient.expoPushToken,
              title: message.authorId.name || "Новое сообщение",
              body: text || "Новое сообщение",
              data: {
                chatId,
                messageId: message._id.toString(),
              },
            })
          )
        );
      } catch (pushError) {
        console.error("Ошибка отправки push-уведомлений:", pushError);
      }

      // Обновляем список чатов для всех участников
      const updatedChat = await Chat.findById(chatId)
        .populate("members", "name email avatar")
        .populate("lastMessage");
      
      const chatPayload = {
        id: updatedChat._id.toString(),
        type: updatedChat.type,
        title: updatedChat.type === "private" ? null : updatedChat.title,
        lastMessage: {
          id: message._id.toString(),
          text: message.text,
          author: {
            id: message.authorId._id.toString(),
            name: message.authorId.name,
          },
        },
        lastMessageAt: updatedChat.lastMessageAt,
      };

      memberIds.forEach((memberId) => {
        io.to(`user:${memberId}`).emit("chat_updated", {
          ...chatPayload,
          unreadCount: updatedChat.unreadCount?.get(memberId) || 0,
        });
      });
    } catch (error) {
      console.error("Ошибка при отправке сообщения:", error);
      socket.emit("error", { message: "Ошибка сервера при отправке сообщения" });
    }
  });

  // Редактировать сообщение
  socket.on("edit_message", async ({ messageId, text }) => {
    try {
      const mongoose = (await import("mongoose")).default;
      const message = await Message.findById(new mongoose.Types.ObjectId(messageId));
      
      if (!message) {
        socket.emit("error", { message: "Сообщение не найдено" });
        return;
      }

      if (message.authorId.toString() !== userId) {
        socket.emit("error", { message: "Можно редактировать только свои сообщения" });
        return;
      }

      if (!text || typeof text !== "string" || !text.trim()) {
        socket.emit("error", { message: "Текст сообщения обязателен" });
        return;
      }

      message.text = text.trim();
      message.editedAt = new Date();
      await message.save();

      // Уведомляем всех участников чата
      io.to(`chat:${message.chatId.toString()}`).emit("message_updated", {
        id: message._id.toString(),
        chatId: message.chatId.toString(),
        text: message.text,
        editedAt: message.editedAt,
      });
    } catch (error) {
      console.error("Ошибка редактирования сообщения:", error);
      socket.emit("error", { message: "Ошибка сервера" });
    }
  });

  // Удалить сообщение
  socket.on("delete_message", async ({ messageId }) => {
    try {
      const mongoose = (await import("mongoose")).default;
      const message = await Message.findById(new mongoose.Types.ObjectId(messageId));
      
      if (!message) {
        socket.emit("error", { message: "Сообщение не найдено" });
        return;
      }

      if (message.authorId.toString() !== userId) {
        socket.emit("error", { message: "Можно удалять только свои сообщения" });
        return;
      }

      message.deletedAt = new Date();
      await message.save();

      // Уведомляем всех участников чата
      io.to(`chat:${message.chatId.toString()}`).emit("message_deleted", {
        id: message._id.toString(),
        chatId: message.chatId.toString(),
      });
    } catch (error) {
      console.error("Ошибка удаления сообщения:", error);
      socket.emit("error", { message: "Ошибка сервера" });
    }
  });

  // Индикатор печати (typing)
  const typingUsers = new Map(); // chatId -> Set<userId>
  
  socket.on("typing_start", async ({ chatId }) => {
    const mongoose = (await import("mongoose")).default;
    const chat = await Chat.findById(chatId);
    if (!chat) return;

    if (!typingUsers.has(chatId)) {
      typingUsers.set(chatId, new Set());
    }
    typingUsers.get(chatId).add(userId);

    // Уведомляем других участников (кроме отправителя)
    socket.to(`chat:${chatId}`).emit("user_typing", {
      chatId,
      userId,
      userName: user.name,
    });
  });

  socket.on("typing_stop", ({ chatId }) => {
    const users = typingUsers.get(chatId);
    if (users) {
      users.delete(userId);
      if (users.size === 0) {
        typingUsers.delete(chatId);
      }
    }

    socket.to(`chat:${chatId}`).emit("user_stopped_typing", {
      chatId,
      userId,
    });
  });

  // Переслать сообщение
  socket.on("forward_message", async ({ messageId, targetChatId }) => {
    try {
      const mongoose = (await import("mongoose")).default;
      
      // Получаем исходное сообщение
      const originalMessage = await Message.findById(new mongoose.Types.ObjectId(messageId))
        .populate("authorId", "name email");
      
      if (!originalMessage) {
        socket.emit("error", { message: "Сообщение не найдено" });
        return;
      }

      // Проверяем доступ к целевому чату
      const targetChat = await Chat.findById(new mongoose.Types.ObjectId(targetChatId));
      if (!targetChat) {
        socket.emit("error", { message: "Целевой чат не найден" });
        return;
      }

      const memberIds = targetChat.members.map((m) => m.toString());
      if (!memberIds.includes(userId)) {
        socket.emit("error", { message: "Нет доступа к целевому чату" });
        return;
      }

      // Создаем новое сообщение с пересылкой
      const forwardedMessage = new Message({
        chatId: new mongoose.Types.ObjectId(targetChatId),
        authorId: new mongoose.Types.ObjectId(userId),
        text: originalMessage.text,
        media: originalMessage.media,
        forwardedFrom: originalMessage._id,
        forwardedFromUser: originalMessage.authorId._id,
        status: "sent",
      });
      await forwardedMessage.save();

      // Обновляем последнее сообщение в целевом чате
      targetChat.lastMessage = forwardedMessage._id;
      targetChat.lastMessageAt = new Date();
      
      if (!targetChat.unreadCount) {
        targetChat.unreadCount = new Map();
      }
      memberIds.forEach((memberId) => {
        if (memberId !== userId) {
          const current = targetChat.unreadCount.get(memberId) || 0;
          targetChat.unreadCount.set(memberId, current + 1);
        }
      });
      await targetChat.save();

      // Загружаем автора для отправки клиентам
      await forwardedMessage.populate("authorId", "name email");
      await forwardedMessage.populate("forwardedFromUser", "name");

      const messagePayload = {
        id: forwardedMessage._id.toString(),
        chatId: forwardedMessage.chatId.toString(),
        authorId: forwardedMessage.authorId._id.toString(),
        text: forwardedMessage.text,
        createdAt: forwardedMessage.createdAt,
        status: forwardedMessage.status,
        media: forwardedMessage.media,
        forwardedFrom: {
          id: originalMessage._id.toString(),
          text: originalMessage.text,
        },
        forwardedFromUser: {
          id: forwardedMessage.forwardedFromUser._id.toString(),
          name: forwardedMessage.forwardedFromUser.name,
        },
        author: {
          id: forwardedMessage.authorId._id.toString(),
          name: forwardedMessage.authorId.name,
          email: forwardedMessage.authorId.email,
        },
      };

      // Отправляем новое сообщение всем участникам целевого чата
      io.to(`chat:${targetChatId}`).emit("new_message", messagePayload);

      // Обновляем список чатов для всех участников
      const updatedChat = await Chat.findById(targetChatId)
        .populate("members", "name email avatar")
        .populate("lastMessage");
      
      const chatPayload = {
        id: updatedChat._id.toString(),
        type: updatedChat.type,
        title: updatedChat.type === "private" ? null : updatedChat.title,
        lastMessage: {
          id: forwardedMessage._id.toString(),
          text: forwardedMessage.text || "Пересланное сообщение",
          author: {
            id: forwardedMessage.authorId._id.toString(),
            name: forwardedMessage.authorId.name,
          },
        },
        lastMessageAt: updatedChat.lastMessageAt,
      };

      memberIds.forEach((memberId) => {
        io.to(`user:${memberId}`).emit("chat_updated", {
          ...chatPayload,
          unreadCount: updatedChat.unreadCount?.get(memberId) || 0,
        });
      });
    } catch (error) {
      console.error("Ошибка пересылки сообщения:", error);
      socket.emit("error", { message: "Ошибка сервера" });
    }
  });

  // Отметить сообщения как прочитанные
  socket.on("mark_read", async ({ chatId, messageIds }) => {
    try {
      const mongoose = (await import("mongoose")).default;
      
      if (messageIds && Array.isArray(messageIds)) {
        // Отмечаем конкретные сообщения
        for (const msgId of messageIds) {
          const msg = await Message.findById(new mongoose.Types.ObjectId(msgId));
          if (msg && msg.chatId.toString() === chatId) {
            const alreadyRead = msg.readBy.some(
              (r) => r.userId.toString() === userId
            );
            if (!alreadyRead) {
              msg.readBy.push({
                userId: new mongoose.Types.ObjectId(userId),
                readAt: new Date(),
              });
              msg.status = "read";
              await msg.save();
            }
          }
        }
      } else {
        // Отмечаем все сообщения в чате как прочитанные
        await Message.updateMany(
          {
            chatId: new mongoose.Types.ObjectId(chatId),
            authorId: { $ne: new mongoose.Types.ObjectId(userId) },
            readBy: { $not: { $elemMatch: { userId: new mongoose.Types.ObjectId(userId) } } },
          },
          {
            $push: {
              readBy: {
                userId: new mongoose.Types.ObjectId(userId),
                readAt: new Date(),
              },
            },
            $set: { status: "read" },
          }
        );
      }

      // Обнуляем счетчик непрочитанных
      const chat = await Chat.findById(chatId);
      if (chat && chat.unreadCount) {
        chat.unreadCount.set(userId, 0);
        await chat.save();
      }

      // Уведомляем других участников о прочтении
      io.to(`chat:${chatId}`).emit("messages_read", {
        chatId,
        userId,
      });

      // Отправляем обновлённый chat_updated, чтобы на UI сбросился badge непрочитанных
      try {
        const updatedChat = await Chat.findById(chatId)
          .populate("members", "name email avatar")
          .populate("lastMessage");

        if (updatedChat) {
          const memberIds = updatedChat.members.map((m) => m._id.toString());

          const chatPayload = {
            id: updatedChat._id.toString(),
            type: updatedChat.type,
            title: updatedChat.type === "private" ? null : updatedChat.title,
            lastMessage: updatedChat.lastMessage
              ? {
                  id: updatedChat.lastMessage._id.toString(),
                  text: updatedChat.lastMessage.text,
                  author: updatedChat.lastMessage.authorId
                    ? {
                        id: updatedChat.lastMessage.authorId._id.toString(),
                        name: updatedChat.lastMessage.authorId.name,
                      }
                    : null,
                }
              : null,
            lastMessageAt: updatedChat.lastMessageAt,
          };

          memberIds.forEach((memberId) => {
            io.to(`user:${memberId}`).emit("chat_updated", {
              ...chatPayload,
              unreadCount: updatedChat.unreadCount?.get(memberId) || 0,
            });
          });
        }
      } catch (err) {
        console.error("Ошибка при отправке chat_updated после mark_read:", err);
      }
    } catch (error) {
      console.error("Ошибка отметки прочтения:", error);
      socket.emit("error", { message: "Ошибка сервера" });
    }
  });

  // Добавить реакцию на сообщение
  socket.on("add_reaction", async ({ messageId, emoji }) => {
    try {
      const mongoose = (await import("mongoose")).default;
      const message = await Message.findById(new mongoose.Types.ObjectId(messageId));
      
      if (!message) {
        socket.emit("error", { message: "Сообщение не найдено" });
        return;
      }

      // Проверяем доступ к чату
      const chat = await Chat.findById(message.chatId);
      if (!chat) {
        socket.emit("error", { message: "Чат не найден" });
        return;
      }

      const memberIds = chat.members.map((m) => m.toString());
      if (!memberIds.includes(userId)) {
        socket.emit("error", { message: "Нет доступа к этому чату" });
        return;
      }

      // Валидация эмодзи (разрешаем популярные эмодзи)
      const allowedEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏", "🎉", "💯"];
      if (!allowedEmojis.includes(emoji)) {
        socket.emit("error", { message: "Недопустимый эмодзи" });
        return;
      }

      // Ищем существующую реакцию с таким эмодзи
      const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);
      
      if (reactionIndex >= 0) {
        // Реакция уже есть - добавляем userId если его еще нет
        const userIdObj = new mongoose.Types.ObjectId(userId);
        if (!message.reactions[reactionIndex].userIds.some((id) => id.toString() === userId)) {
          message.reactions[reactionIndex].userIds.push(userIdObj);
        }
      } else {
        // Новая реакция
        message.reactions.push({
          emoji,
          userIds: [new mongoose.Types.ObjectId(userId)],
        });
      }

      await message.save();

      // Уведомляем всех участников чата
      io.to(`chat:${message.chatId.toString()}`).emit("reaction_added", {
        messageId: message._id.toString(),
        chatId: message.chatId.toString(),
        emoji,
        userId,
        reactions: message.reactions.map((r) => ({
          emoji: r.emoji,
          count: r.userIds.length,
        })),
      });
    } catch (error) {
      console.error("Ошибка добавления реакции:", error);
      socket.emit("error", { message: "Ошибка сервера" });
    }
  });

  // Удалить реакцию с сообщения
  socket.on("remove_reaction", async ({ messageId, emoji }) => {
    try {
      const mongoose = (await import("mongoose")).default;
      const message = await Message.findById(new mongoose.Types.ObjectId(messageId));
      
      if (!message) {
        socket.emit("error", { message: "Сообщение не найдено" });
        return;
      }

      // Проверяем доступ к чату
      const chat = await Chat.findById(message.chatId);
      if (!chat) {
        socket.emit("error", { message: "Чат не найден" });
        return;
      }

      const memberIds = chat.members.map((m) => m.toString());
      if (!memberIds.includes(userId)) {
        socket.emit("error", { message: "Нет доступа к этому чату" });
        return;
      }

      // Ищем реакцию с таким эмодзи
      const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);
      
      if (reactionIndex >= 0) {
        // Удаляем userId из реакции
        message.reactions[reactionIndex].userIds = message.reactions[reactionIndex].userIds.filter(
          (id) => id.toString() !== userId
        );

        // Если больше никто не поставил эту реакцию, удаляем её
        if (message.reactions[reactionIndex].userIds.length === 0) {
          message.reactions.splice(reactionIndex, 1);
        }

        await message.save();

        // Уведомляем всех участников чата
        io.to(`chat:${message.chatId.toString()}`).emit("reaction_removed", {
          messageId: message._id.toString(),
          chatId: message.chatId.toString(),
          emoji,
          userId,
          reactions: message.reactions.map((r) => ({
            emoji: r.emoji,
            count: r.userIds.length,
          })),
        });
      }
    } catch (error) {
      console.error("Ошибка удаления реакции:", error);
      socket.emit("error", { message: "Ошибка сервера" });
    }
  });

  // Запрос онлайн-статуса пользователей
  socket.on("get_user_status", ({ userIds }) => {
    if (!Array.isArray(userIds)) {
      socket.emit("error", { message: "userIds должен быть массивом" });
      return;
    }

    const statuses = userIds.map((id) => ({
      userId: id,
      isOnline: isUserOnline(id),
    }));

    socket.emit("user_status_response", { statuses });
  });

  socket.on("disconnect", async () => {
    console.log(`Socket disconnected: userId=${userId}, socketId=${socketId}`);

    // Отмечаем пользователя как оффлайн
    markUserOffline(userId, socketId);

    // Если пользователь полностью оффлайн (нет других подключений)
    if (!isUserOnline(userId)) {
      // Получаем все чаты пользователя для уведомления
      const userChatIds = Array.from(userRooms.get(userId) || []);

      // Уведомляем о выходе из сети
      await notifyUserStatusChange(userId, false, userChatIds);

      // Очищаем комнаты пользователя
      userRooms.delete(userId);
    }
  });
});

// Централизованный обработчик ошибок для всех HTTP-роутов,
// в том числе объявленных в этом файле
app.use(errorHandler);

// Подключение к БД и запуск сервера
connectDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
});
