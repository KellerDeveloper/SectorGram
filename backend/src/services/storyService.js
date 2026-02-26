import mongoose from "mongoose";
import Story from "../models/Story.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";

const STORY_TTL_HOURS = 24;

function getExpirationDate() {
  const d = new Date();
  d.setHours(d.getHours() - STORY_TTL_HOURS);
  return d;
}

/**
 * Создать историю
 */
export async function createStory({ userId, type, media, text }) {
  if (!type || !["photo", "text"].includes(type)) {
    const error = new Error("type должен быть photo или text");
    error.status = 400;
    throw error;
  }
  if (type === "photo" && !media?.url) {
    const error = new Error("Для фото нужен media.url");
    error.status = 400;
    throw error;
  }
  if (type === "text" && (!text || !text.trim())) {
    const error = new Error("Для текстовой истории нужен text");
    error.status = 400;
    throw error;
  }

  const story = new Story({
    userId: new mongoose.Types.ObjectId(userId),
    type,
    media: media || undefined,
    text: text?.trim() || undefined,
  });
  await story.save();
  await story.populate("userId", "name avatar");
  return {
    id: story._id.toString(),
    userId: story.userId._id.toString(),
    user: {
      id: story.userId._id.toString(),
      name: story.userId.name,
      avatar: story.userId.avatar,
    },
    type: story.type,
    media: story.media,
    text: story.text,
    createdAt: story.createdAt,
    viewedBy: story.viewedBy || [],
  };
}

/**
 * Получить ленту историй: пользователи (из чатов текущего пользователя + сам пользователь),
 * у которых есть хотя бы одна история за последние 24 часа. Для каждого — последняя история и счётчик.
 */
export async function getStoriesFeed(currentUserId) {
  const since = getExpirationDate();
  const currentUserObjId = new mongoose.Types.ObjectId(currentUserId);

  // Участники чатов текущего пользователя
  const chats = await Chat.find({ members: currentUserObjId }).select("members").lean();
  const contactIds = new Set();
  chats.forEach((c) => {
    c.members.forEach((mid) => contactIds.add(mid.toString()));
  });
  contactIds.add(currentUserId);

  const userIds = Array.from(contactIds).map((id) => new mongoose.Types.ObjectId(id));

  const stories = await Story.find({
    userId: { $in: userIds },
    createdAt: { $gte: since },
  })
    .populate("userId", "name avatar")
    .sort({ createdAt: -1 })
    .lean();

  const byUser = new Map();
  stories.forEach((s) => {
    const uid = s.userId._id.toString();
    if (!byUser.has(uid)) {
      byUser.set(uid, {
        userId: uid,
        user: {
          id: s.userId._id.toString(),
          name: s.userId.name,
          avatar: s.userId.avatar,
        },
        stories: [],
      });
    }
    byUser.get(uid).stories.push({
      id: s._id.toString(),
      type: s.type,
      media: s.media,
      text: s.text,
      createdAt: s.createdAt,
      viewedBy: (s.viewedBy || []).map((v) => ({
        userId: v.userId?.toString(),
        viewedAt: v.viewedAt,
      })),
    });
  });

  return Array.from(byUser.values()).map((entry) => ({
    ...entry,
    stories: entry.stories.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    ),
  }));
}

/**
 * Истории одного пользователя за последние 24 часа
 */
export async function getStoriesByUserId(currentUserId, targetUserId) {
  const since = getExpirationDate();
  const targetObjId = new mongoose.Types.ObjectId(targetUserId);

  const stories = await Story.find({
    userId: targetObjId,
    createdAt: { $gte: since },
  })
    .populate("userId", "name avatar")
    .sort({ createdAt: 1 })
    .lean();

  if (stories.length === 0) return null;

  const user = stories[0].userId;
  return {
    userId: user._id.toString(),
    user: {
      id: user._id.toString(),
      name: user.name,
      avatar: user.avatar,
    },
    stories: stories.map((s) => ({
      id: s._id.toString(),
      type: s.type,
      media: s.media,
      text: s.text,
      createdAt: s.createdAt,
      viewedBy: (s.viewedBy || []).map((v) => ({
        userId: v.userId?.toString(),
        viewedAt: v.viewedAt,
      })),
    })),
  };
}

/**
 * Отметить историю как просмотренную
 */
export async function markStoryViewed(storyId, viewerUserId) {
  const story = await Story.findById(storyId);
  if (!story) return null;
  const viewerId = new mongoose.Types.ObjectId(viewerUserId);
  const already = (story.viewedBy || []).some(
    (v) => v.userId && v.userId.toString() === viewerUserId
  );
  if (!already) {
    story.viewedBy = story.viewedBy || [];
    story.viewedBy.push({ userId: viewerId, viewedAt: new Date() });
    await story.save();
  }
  return story;
}

/**
 * Удалить историю (только автор)
 */
export async function deleteStory(storyId, userId) {
  const story = await Story.findOne({
    _id: storyId,
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!story) return null;
  await story.deleteOne();
  return { deleted: true };
}
