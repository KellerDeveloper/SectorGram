import mongoose from "mongoose";
import User from "../models/User.js";
import Event from "../models/Event.js";
import EventReminder from "../models/EventReminder.js";
import AdminActionLog from "../models/AdminActionLog.js";
import { sendTelegramMessage } from "./telegramService.js";

function toObjectId(id) {
  return new mongoose.Types.ObjectId(String(id));
}

function getAdminBaseMatchForPastEvents() {
  const now = new Date();

  // Прошедшие мероприятия:
  // - старт уже был
  // - если `endsAt` есть — тоже уже был
  // - если `endsAt` нет — считаем по `startsAt`
  return {
    status: { $ne: "cancelled" },
    startsAt: { $lte: now },
    $or: [
      { endsAt: { $exists: false } },
      { endsAt: null },
      { endsAt: { $lte: now } },
    ],
  };
}

async function writeAdminLog({ adminId, action, targetType, targetId, payload }) {
  try {
    await AdminActionLog.create({
      adminId: toObjectId(adminId),
      action,
      targetType,
      targetId: String(targetId),
      payload: payload ?? undefined,
    });
  } catch (e) {
    // Логи не должны ломать админские операции
    console.error("Failed to write admin action log:", e);
  }
}

export async function getAdminUsers({ query, limit = 50, offset = 0 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const userQuery = {};
  if (query && typeof query === "string" && query.trim().length >= 2) {
    const q = query.trim();
    userQuery.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { username: { $regex: q, $options: "i" } },
      { telegramId: { $regex: q, $options: "i" } },
    ];
  }

  const users = await User.find(userQuery)
    .sort({ createdAt: -1 })
    .skip(safeOffset)
    .limit(safeLimit)
    .select("name email username avatar telegramId")
    .lean();

  if (!users.length) {
    return { items: [], total: 0 };
  }

  // Агрегации рейтинга только по отобранным пользователям
  const userIds = users.map((u) => String(u._id));
  const objectUserIds = userIds.map((id) => toObjectId(id));

  const baseMatch = getAdminBaseMatchForPastEvents();

  const creatorsAgg = await Event.aggregate([
    { $match: { ...baseMatch, creatorId: { $in: objectUserIds } } },
    { $group: { _id: "$creatorId", createdCount: { $sum: 1 } } },
  ]);

  const participantsAgg = await Event.aggregate([
    { $match: { ...baseMatch } },
    { $unwind: "$participants" },
    { $match: { participants: { $in: objectUserIds } } },
    { $group: { _id: "$participants", attendedCount: { $sum: 1 } } },
  ]);

  const interestAgg = await Event.aggregate([
    { $match: { ...baseMatch, creatorId: { $in: objectUserIds } } },
    {
      $project: {
        creatorId: 1,
        participantsCount: {
          $cond: [
            { $isArray: "$participants" },
            { $size: "$participants" },
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: "$creatorId",
        interestScore: { $sum: "$participantsCount" },
      },
    },
  ]);

  const scoreMap = new Map();
  for (const u of users) {
    scoreMap.set(String(u._id), {
      userId: String(u._id),
      createdCount: 0,
      attendedCount: 0,
      interestScore: 0,
      ratingScore: 0,
    });
  }

  for (const item of creatorsAgg) {
    const uid = String(item._id);
    const s = scoreMap.get(uid);
    if (s) s.createdCount = item.createdCount || 0;
  }

  for (const item of participantsAgg) {
    const uid = String(item._id);
    const s = scoreMap.get(uid);
    if (s) s.attendedCount = item.attendedCount || 0;
  }

  for (const item of interestAgg) {
    const uid = String(item._id);
    const s = scoreMap.get(uid);
    if (s) s.interestScore = item.interestScore || 0;
  }

  for (const s of scoreMap.values()) {
    s.ratingScore = (s.createdCount || 0) + (s.attendedCount || 0) + (s.interestScore || 0);
  }

  const total = await User.countDocuments(userQuery);

  const items = users.map((u) => {
    const s = scoreMap.get(String(u._id));
    return {
      userId: String(u._id),
      name: u.name,
      username: u.username,
      avatar: u.avatar,
      telegramId: u.telegramId,
      createdEvents: s?.createdCount ?? 0,
      attendedEvents: s?.attendedCount ?? 0,
      interestScore: s?.interestScore ?? 0,
      ratingScore: s?.ratingScore ?? 0,
    };
  });

  // рейтинг по score
  items.sort((a, b) => b.ratingScore - a.ratingScore);

  return { items, total };
}

export async function getAdminUserDetails(userId) {
  const id = toObjectId(userId);
  const user = await User.findById(id)
    .select("name email username avatar telegramId")
    .lean();

  if (!user) {
    const error = new Error("Пользователь не найден");
    error.status = 404;
    throw error;
  }

  const baseMatch = getAdminBaseMatchForPastEvents();

  const creatorsAgg = await Event.aggregate([
    { $match: { ...baseMatch, creatorId: id } },
    { $group: { _id: "$creatorId", createdCount: { $sum: 1 } } },
  ]);

  const participantsAgg = await Event.aggregate([
    { $match: baseMatch },
    { $unwind: "$participants" },
    { $match: { participants: id } },
    { $group: { _id: "$participants", attendedCount: { $sum: 1 } } },
  ]);

  const interestAgg = await Event.aggregate([
    { $match: { ...baseMatch, creatorId: id } },
    {
      $project: {
        creatorId: 1,
        participantsCount: {
          $cond: [
            { $isArray: "$participants" },
            { $size: "$participants" },
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: "$creatorId",
        interestScore: { $sum: "$participantsCount" },
      },
    },
  ]);

  const createdCount = creatorsAgg?.[0]?.createdCount ?? 0;
  const attendedCount = participantsAgg?.[0]?.attendedCount ?? 0;
  const interestScore = interestAgg?.[0]?.interestScore ?? 0;

  return {
    userId: String(user._id),
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    telegramId: user.telegramId,
    createdEvents: createdCount,
    attendedEvents: attendedCount,
    interestScore,
    ratingScore: createdCount + attendedCount + interestScore,
  };
}

export async function adminSetEventStatus({ adminId, eventId, status, actionName }) {
  const event = await Event.findById(toObjectId(eventId));
  if (!event) {
    const error = new Error("Мероприятие не найдено");
    error.status = 404;
    throw error;
  }

  event.status = status;
  await event.save();

  await writeAdminLog({
    adminId,
    action: actionName,
    targetType: "event",
    targetId: String(event._id),
    payload: { status },
  });

  return event.toObject();
}

export async function listAdminEvents({ status, limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const match = {};
  if (status && typeof status === "string") {
    match.status = status;
  }

  // Для админки покажем и прошлые, и будущие по умолчанию.
  // (При желании это можно сузить фильтрами from/to на следующем шаге.)
  const events = await Event.find(match)
    .sort({ startsAt: -1 })
    .skip(safeOffset)
    .limit(safeLimit)
    .populate("creatorId", "name avatar telegramId")
    .populate("participants", "name avatar telegramId")
    .lean();

  return events;
}

function buildReminderTextForAdmin(event, type) {
  const hoursBefore = type === "1h" ? 1 : 3;

  // Сообщение не должно зависеть от того, что уже “отправляли” или нет
  // — используем текущее содержимое события.
  const when = hoursBefore === 1 ? "через 1 час" : "через 3 часа";
  const lines = [];
  lines.push(`Напоминание о мероприятии SEKTOR ${when}.`);
  if (event.title) {
    lines.push("");
    lines.push(`Название: ${event.title}`);
  }
  if (event.place) {
    lines.push(`Место: ${event.place}`);
  }
  lines.push("");
  lines.push("Откройте мини‑приложение SEKTOR, чтобы посмотреть детали события.");
  return lines.join("\n");
}

export async function getAdminReminders({ eventId, userId, sent } = {}) {
  const match = {};
  if (eventId) match.eventId = toObjectId(eventId);
  if (userId) match.userId = toObjectId(userId);
  if (sent === "true" || sent === true) match.sent = true;
  if (sent === "false" || sent === false) match.sent = false;

  const reminders = await EventReminder.find(match)
    .populate("eventId", "title place startsAt")
    .populate("userId", "name telegramId")
    .sort({ remindAt: -1 })
    .lean();

  return reminders;
}

export async function sendAdminReminderNow({ adminId, reminderId }) {
  const reminder = await EventReminder.findById(toObjectId(reminderId))
    .populate("eventId")
    .populate("userId", "telegramId name");

  if (!reminder) {
    const error = new Error("Напоминание не найдено");
    error.status = 404;
    throw error;
  }

  if (!reminder.userId?.telegramId) {
    const error = new Error("У пользователя нет telegramId");
    error.status = 400;
    throw error;
  }

  const text = buildReminderTextForAdmin(reminder.eventId, reminder.type);

  await sendTelegramMessage(reminder.userId.telegramId, text);

  reminder.sent = true;
  await reminder.save();

  await writeAdminLog({
    adminId,
    action: "admin.reminder.send",
    targetType: "eventReminder",
    targetId: String(reminder._id),
    payload: { reminderId: String(reminder._id) },
  });

  return { success: true };
}

export async function resetAdminReminder({ adminId, reminderId }) {
  const reminder = await EventReminder.findById(toObjectId(reminderId));

  if (!reminder) {
    const error = new Error("Напоминание не найдено");
    error.status = 404;
    throw error;
  }

  reminder.sent = false;
  await reminder.save();

  await writeAdminLog({
    adminId,
    action: "admin.reminder.reset",
    targetType: "eventReminder",
    targetId: String(reminder._id),
    payload: { reminderId: String(reminder._id) },
  });

  return { success: true };
}

export async function broadcastAdmin({ adminId, body }) {
  const { message, type, eventId } = body || {};

  if (!message || typeof message !== "string" || !message.trim()) {
    const error = new Error("Поле message обязательно");
    error.status = 400;
    throw error;
  }

  if (!type || typeof type !== "string") {
    const error = new Error("Поле type обязательно");
    error.status = 400;
    throw error;
  }

  let telegramRecipients = [];

  if (type === "all") {
    const users = await User.find({ telegramId: { $exists: true, $ne: null } }).select("telegramId").lean();
    telegramRecipients = users.map((u) => u.telegramId).filter(Boolean);
  } else if (type === "event_participants") {
    if (!eventId) {
      const error = new Error("eventId обязателен для event_participants");
      error.status = 400;
      throw error;
    }

    const event = await Event.findById(toObjectId(eventId))
      .select("participants")
      .populate("participants", "telegramId")
      .lean();

    if (!event) {
      const error = new Error("Мероприятие не найдено");
      error.status = 404;
      throw error;
    }

    telegramRecipients = (event.participants || [])
      .map((p) => p?.telegramId)
      .filter(Boolean);
  } else {
    const error = new Error("Недопустимый type");
    error.status = 400;
    throw error;
  }

  const uniqueRecipients = Array.from(new Set(telegramRecipients.map((x) => String(x))));

  for (const chatId of uniqueRecipients) {
    // Логика отправки будет схлопнута в Telegram сервисе
    try {
      await sendTelegramMessage(chatId, message);
    } catch (e) {
      console.error("Broadcast send failed:", e);
    }
  }

  await writeAdminLog({
    adminId,
    action: "admin.broadcast",
    targetType: "broadcast",
    targetId: uniqueRecipients[0] ? String(uniqueRecipients[0]) : "unknown",
    payload: { type, eventId: eventId ? String(eventId) : null, recipients: uniqueRecipients.length },
  });

  return { success: true, recipients: uniqueRecipients.length };
}

export async function statsUsersAdmin({ limit = 20 } = {}) {
  // Reuse logic of getUserRatings, но без копипаста через импорт во избежание циклов:
  // упрощенно: используем готовый агрегат из коллекции Event как в userService.
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const baseMatch = getAdminBaseMatchForPastEvents();

  const creatorsAgg = await Event.aggregate([
    { $match: baseMatch },
    { $group: { _id: "$creatorId", createdCount: { $sum: 1 } } },
  ]);

  const participantsAgg = await Event.aggregate([
    { $match: baseMatch },
    { $unwind: "$participants" },
    { $group: { _id: "$participants", attendedCount: { $sum: 1 } } },
  ]);

  const interestAgg = await Event.aggregate([
    { $match: baseMatch },
    {
      $project: {
        creatorId: 1,
        participantsCount: {
          $cond: [
            { $isArray: "$participants" },
            { $size: "$participants" },
            0,
          ],
        },
      },
    },
    { $group: { _id: "$creatorId", interestScore: { $sum: "$participantsCount" } } },
  ]);

  const stats = new Map();
  const ensure = (userId) => {
    const id = String(userId);
    if (!stats.has(id)) {
      stats.set(id, { userId: id, createdCount: 0, attendedCount: 0, interestScore: 0 });
    }
    return stats.get(id);
  };

  for (const item of creatorsAgg) {
    ensure(item._id);
    stats.get(String(item._id)).createdCount = item.createdCount || 0;
  }
  for (const item of participantsAgg) {
    ensure(item._id);
    stats.get(String(item._id)).attendedCount = item.attendedCount || 0;
  }
  for (const item of interestAgg) {
    ensure(item._id);
    stats.get(String(item._id)).interestScore = item.interestScore || 0;
  }

  const userIds = Array.from(stats.keys()).map((id) => toObjectId(id));
  const users = await User.find({ _id: { $in: userIds } }).select("name username avatar").lean();
  const usersById = new Map(users.map((u) => [String(u._id), u]));

  const rows = Array.from(stats.values()).map((s) => {
    const u = usersById.get(s.userId);
    return {
      userId: s.userId,
      name: u?.name,
      username: u?.username,
      avatar: u?.avatar,
      createdEvents: s.createdCount,
      attendedEvents: s.attendedCount,
      interestScore: s.interestScore,
      ratingScore: s.createdCount + s.attendedCount + s.interestScore,
    };
  });

  rows.sort((a, b) => b.ratingScore - a.ratingScore);
  return rows.slice(0, safeLimit);
}

export async function statsEventsAdmin({ limit = 10 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const baseMatch = getAdminBaseMatchForPastEvents();

  const events = await Event.find(baseMatch)
    .sort({ startsAt: -1 })
    .populate("creatorId", "name avatar")
    .lean();

  // Top by participants count
  const top = events
    .map((e) => ({ ...e, participantsCount: Array.isArray(e.participants) ? e.participants.length : 0 }))
    .sort((a, b) => b.participantsCount - a.participantsCount)
    .slice(0, safeLimit)
    .map((e) => ({
      id: String(e._id),
      title: e.title,
      startsAt: e.startsAt,
      place: e.place,
      status: e.status,
      participantsCount: e.participantsCount,
      creator: e.creatorId
        ? { id: String(e.creatorId._id), name: e.creatorId.name, avatar: e.creatorId.avatar }
        : null,
    }));

  return top;
}

export async function getAdminAudit({ limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const logs = await AdminActionLog.find({})
    .sort({ createdAt: -1 })
    .skip(safeOffset)
    .limit(safeLimit)
    .populate("adminId", "name username avatar telegramId")
    .lean();

  return logs.map((l) => ({
    id: String(l._id),
    admin: l.adminId
      ? {
          id: String(l.adminId._id),
          name: l.adminId.name,
          username: l.adminId.username,
          avatar: l.adminId.avatar,
          telegramId: l.adminId.telegramId,
        }
      : null,
    action: l.action,
    targetType: l.targetType,
    targetId: l.targetId,
    payload: l.payload,
    createdAt: l.createdAt,
  }));
}

