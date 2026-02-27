import jwt from "jsonwebtoken";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import {
  onlineUsers,
  userRooms,
  markUserOnline,
  markUserOffline,
  isUserOnline,
  getOnlineUsers,
  addUserRoom,
  removeUserRoom,
  getUserRooms,
} from "./presenceStore.js";

const { JWT_SECRET } = process.env;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Please configure it in your environment (.env or hosting settings).");
}

export function initSocket(io) {
  // Аутентификация сокета
  io.use((socket, next) => {
    let token = socket.handshake.auth?.token;

    // iOS/другие клиенты могут передать токен через query: ?token=...
    if (!token && socket.handshake.query?.token) {
      token = socket.handshake.query.token;
    }

    // Опционально — поддержка Authorization заголовка: "Bearer <token>"
    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice("Bearer ".length);
      }
    }

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

    socket.join(`user:${userId}`);

    const wasOffline = !isUserOnline(userId);
    markUserOnline(userId, socketId);

    if (wasOffline) {
      try {
        const mongoose = (await import("mongoose")).default;
        const userChats = await Chat.find({
          members: new mongoose.Types.ObjectId(userId),
        });
        const userChatIds = userChats.map((c) => c._id.toString());

        await notifyUserStatusChange(io, userId, true, userChatIds);

        userChatIds.forEach((chatId) => {
          socket.join(`chat:${chatId}`);
        });

        userChatIds.forEach((chatId) => {
          addUserRoom(userId, chatId);
        });
      } catch (error) {
        console.error("Ошибка при подключении пользователя:", error);
      }
    }

    registerChatHandlers(io, socket, { userId });
    registerTypingHandlers(io, socket, { userId });
    registerReactionHandlers(io, socket, { userId });
    registerPresenceHandlers(io, socket, { userId });

    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: userId=${userId}, socketId=${socketId}`);

      markUserOffline(userId, socketId);

      if (!isUserOnline(userId)) {
        const userChatIds = getUserRooms(userId);

        await notifyUserStatusChange(io, userId, false, userChatIds);

        userRooms.delete(userId);
      }
    });
  });
}

// Ниже идут регистраторы обработчиков по доменам.

function registerChatHandlers(io, socket, { userId }) {
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
      addUserRoom(userId, chatId);

      socket.to(`chat:${chatId}`).emit("user_joined_chat", {
        userId,
        chatId,
        user: { id: user.id, name: user.name, email: user.email },
        timestamp: new Date().toISOString(),
      });

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
    removeUserRoom(userId, chatId);

    socket.to(`chat:${chatId}`).emit("user_left_chat", {
      userId,
      chatId,
      timestamp: new Date().toISOString(),
    });
  });

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

      if ((!text || typeof text !== "string" || !text.trim()) && !media) {
        socket.emit("error", { message: "Текст или медиа обязательны" });
        return;
      }

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

      chat.lastMessage = message._id;
      chat.lastMessageAt = new Date();

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

      await message.populate("authorId", "name email");
      if (replyTo) {
        const replyMsg = await Message.findById(replyTo).populate(
          "authorId",
          "name"
        );
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
        reactions:
          message.reactions?.map((r) => ({
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

      io.to(`chat:${chatId}`).emit("new_message", messagePayload);

      try {
        const recipients = await User.find({
          _id: { $in: memberIds.filter((id) => id !== userId) },
          expoPushToken: { $exists: true, $ne: null },
        });

        await Promise.all(
          recipients.map((recipient) =>
            sendExpoPushNotification({
              to: recipient.expoPushToken,
              title: `Новое сообщение от ${user.name}`,
              body: message.text || "Отправлено медиа сообщение",
              data: {
                chatId,
                messageId: message._id.toString(),
              },
            })
          )
        );
      } catch (error) {
        console.error("Ошибка отправки push-уведомлений:", error);
      }

      try {
        const updatedChat = await Chat.findById(chatId)
          .populate("members", "name email avatar")
          .populate("lastMessage");

        if (updatedChat) {
          const memberIdsUpdated = updatedChat.members.map((m) =>
            m._id.toString()
          );

          const chatPayload = {
            id: updatedChat._id.toString(),
            type: updatedChat.type,
            title:
              updatedChat.type === "private" ? null : updatedChat.title,
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

          memberIdsUpdated.forEach((memberId) => {
            io.to(`user:${memberId}`).emit("chat_updated", {
              ...chatPayload,
              unreadCount:
                updatedChat.unreadCount?.get(memberId) || 0,
            });
          });
        }
      } catch (err) {
        console.error("Ошибка отправки chat_updated:", err);
      }
    } catch (error) {
      console.error("Ошибка отправки сообщения:", error);
      socket.emit("error", { message: "Ошибка сервера" });
    }
  });
}

function registerTypingHandlers(io, socket, { userId }) {
  // Здесь будут перенесены обработчики typing_start/typing_stop из server.js
}

function registerReactionHandlers(io, socket, { userId }) {
  // Здесь будут перенесены add_reaction/remove_reaction из server.js
}

function registerPresenceHandlers(io, socket, { userId }) {
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
}

async function notifyUserStatusChange(io, userId, isOnline, chatIds = []) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const statusEvent = {
      userId: user._id.toString(),
      isOnline,
      user: { id: user._id.toString(), name: user.name, email: user.email },
      timestamp: new Date().toISOString(),
    };

    chatIds.forEach((chatId) => {
      io.to(`chat:${chatId}`).emit("user_status_change", statusEvent);
    });

    io.emit("user_status_change", statusEvent);
  } catch (error) {
    console.error("Ошибка при уведомлении о статусе:", error);
  }
}

