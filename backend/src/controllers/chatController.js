import {
  listUserChats,
  createGroupChat,
  getOrCreatePrivateChat,
  getChatMessages,
  updateMessage,
} from "../services/chatService.js";

import Chat from "../models/Chat.js";

export async function getChats(req, res, next) {
  try {
    const userId = req.user.id;
    const { getOnlineUsers, isUserOnline } = req.app.locals.chatHelpers;

    const chats = await listUserChats(userId, { getOnlineUsers, isUserOnline });
    res.json(chats);
  } catch (error) {
    console.error("Ошибка получения чатов:", error);
    next(error);
  }
}

export async function createChat(req, res, next) {
  try {
    const { title, memberIds } = req.body || {};
    const userId = req.user.id;

    const chat = await createGroupChat({
      title,
      memberIds,
      currentUserId: userId,
    });

    res.status(201).json(chat);
  } catch (error) {
    console.error("Ошибка создания чата:", error);
    next(error);
  }
}

export async function createOrGetPrivateChat(req, res, next) {
  try {
    const { userId: otherUserId } = req.body || {};
    const currentUserId = req.user.id;
    const { isUserOnline } = req.app.locals.chatHelpers;

    const chat = await getOrCreatePrivateChat(currentUserId, otherUserId, {
      isUserOnline,
    });

    res.json(chat);
  } catch (error) {
    console.error("Ошибка создания личного чата:", error);
    next(error);
  }
}

export async function getMessages(req, res, next) {
  try {
    const userId = req.user.id;
    const chatId = req.params.id;

    const messages = await getChatMessages({ userId, chatId });
    res.json(messages);
  } catch (error) {
    console.error("Ошибка получения сообщений:", error);
    next(error);
  }
}

export async function editMessage(req, res, next) {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;
    const { text } = req.body || {};

    const { message } = await updateMessage({ userId, messageId, text });

    res.json({
      id: message._id.toString(),
      text: message.text,
      editedAt: message.editedAt,
    });

    // уведомление через socket оставляем в server.js,
    // здесь только HTTP-ответ
  } catch (error) {
    console.error("Ошибка редактирования сообщения:", error);
    next(error);
  }
}

// Удаление сообщения остаётся в server.js, т.к. жёстко завязано на Socket.IO;
// позже может быть вынесено в отдельный сервис.

