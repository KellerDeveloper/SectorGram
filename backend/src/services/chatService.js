import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

export async function listUserChats(userId, { getOnlineUsers, isUserOnline }) {
  const userChats = await Chat.find({
    members: new mongoose.Types.ObjectId(userId),
  })
    .populate("members", "name email avatar")
    .populate("lastMessage")
    .sort({ lastMessageAt: -1, updatedAt: -1 });

  const chatsWithData = await Promise.all(
    userChats.map(async (chat) => {
      const memberIds = chat.members.map((m) => m._id.toString());
      const onlineMemberIds = getOnlineUsers(memberIds);

      let otherUser = null;
      if (chat.type === "private") {
        const rawOther = chat.members.find(
          (m) => m._id.toString() !== userId
        );
        if (rawOther) {
          otherUser = {
            id: rawOther._id.toString(),
            name: rawOther.name,
            email: rawOther.email,
            avatar: rawOther.avatar,
            isOnline: isUserOnline(rawOther._id.toString()),
          };
        }
      }

      let lastMessage = null;
      if (chat.lastMessage) {
        const msg = await Message.findById(chat.lastMessage)
          .populate("authorId", "name")
          .lean();
        if (msg) {
          lastMessage = {
            id: msg._id.toString(),
            text: msg.text,
            author: {
              id: msg.authorId._id.toString(),
              name: msg.authorId.name,
            },
          };
        }
      }

      return {
        id: chat._id.toString(),
        type: chat.type,
        title: chat.type === "private" ? null : chat.title,
        members: memberIds,
        onlineCount: onlineMemberIds.length,
        totalCount: chat.members.length,
        lastMessage,
        lastMessageAt: chat.lastMessageAt || chat.updatedAt,
        otherUser,
        unreadCount: chat.unreadCount?.get(userId) || 0,
      };
    })
  );

  return chatsWithData;
}

export async function createGroupChat({ title, memberIds, currentUserId }) {
  if (!title) {
    const error = new Error("title обязателен");
    error.status = 400;
    throw error;
  }

  const uniqueMemberIds = Array.from(
    new Set([currentUserId, ...(memberIds || [])])
  ).map((id) => new mongoose.Types.ObjectId(id));

  const chat = new Chat({
    type: "group",
    title,
    members: uniqueMemberIds,
  });

  await chat.save();

  return {
    id: chat._id.toString(),
    type: chat.type,
    title: chat.title,
    members: chat.members.map((m) => m.toString()),
  };
}

export async function getOrCreatePrivateChat(currentUserId, otherUserId, { isUserOnline }) {
  if (!otherUserId || otherUserId === currentUserId) {
    const error = new Error("Неверный userId");
    error.status = 400;
    throw error;
  }

  const currentUserObjId = new mongoose.Types.ObjectId(currentUserId);
  const otherUserObjId = new mongoose.Types.ObjectId(otherUserId);

  let chat = await Chat.findOne({
    type: "private",
    members: { $all: [currentUserObjId, otherUserObjId], $size: 2 },
  }).populate("members", "name email avatar");

  if (!chat) {
    chat = new Chat({
      type: "private",
      members: [currentUserObjId, otherUserObjId],
    });
    await chat.save();
    await chat.populate("members", "name email avatar");
  }

  const otherUser = chat.members.find(
    (m) => m._id.toString() !== currentUserId
  );

  return {
    id: chat._id.toString(),
    type: chat.type,
    title: null,
    members: chat.members.map((m) => m._id.toString()),
    otherUser: {
      id: otherUser._id.toString(),
      name: otherUser.name,
      email: otherUser.email,
      avatar: otherUser.avatar,
      isOnline: isUserOnline(otherUser._id.toString()),
    },
  };
}

export async function getChatMessages({ userId, chatId }) {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    const error = new Error("Чат не найден");
    error.status = 404;
    throw error;
  }

  const memberIds = chat.members.map((m) => m.toString());
  if (!memberIds.includes(userId)) {
    const error = new Error("Нет доступа к этому чату");
    error.status = 403;
    throw error;
  }

  const messages = await Message.find({
    chatId,
    deletedAt: null,
  })
    .populate("authorId", "name email")
    .populate("forwardedFromUser", "name")
    .populate({
      path: "replyTo",
      populate: {
        path: "authorId",
        select: "name",
      },
    })
    .sort({ createdAt: 1 })
    .limit(100);

  return messages.map((m) => ({
    id: m._id.toString(),
    chatId: m.chatId.toString(),
    authorId: m.authorId._id.toString(),
    text: m.text,
    createdAt: m.createdAt,
    editedAt: m.editedAt,
    status: m.status,
    media: m.media,
    replyTo: m.replyTo
      ? {
          id: m.replyTo._id?.toString(),
          text: m.replyTo.text,
          author: m.replyTo.authorId
            ? {
                id: m.replyTo.authorId._id?.toString(),
                name: m.replyTo.authorId.name,
              }
            : null,
        }
      : null,
    forwardedFrom: m.forwardedFrom
      ? {
          id: m.forwardedFrom.toString(),
        }
      : null,
    forwardedFromUser: m.forwardedFromUser
      ? {
          id: m.forwardedFromUser._id.toString(),
          name: m.forwardedFromUser.name,
        }
      : null,
    reactions:
      m.reactions?.map((r) => ({
        emoji: r.emoji,
        count: r.userIds.length,
      })) || [],
    author: {
      id: m.authorId._id.toString(),
      name: m.authorId.name,
      email: m.authorId.email,
    },
  }));
}

export async function updateMessage({ userId, messageId, text }) {
  const mongoose = await import("mongoose");
  const MessageModel = Message;

  const message = await MessageModel.findById(
    new mongoose.default.Types.ObjectId(messageId)
  );
  if (!message) {
    const error = new Error("Сообщение не найдено");
    error.status = 404;
    throw error;
  }

  if (message.authorId.toString() !== userId) {
    const error = new Error("Можно редактировать только свои сообщения");
    error.status = 403;
    throw error;
  }

  if (!text || typeof text !== "string" || !text.trim()) {
    const error = new Error("Текст сообщения обязателен");
    error.status = 400;
    throw error;
  }

  message.text = text.trim();
  message.editedAt = new Date();
  await message.save();

  await message.populate("authorId", "name email");

  return {
    message,
  };
}

