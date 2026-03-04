import mongoose from "mongoose";
import Event from "../models/Event.js";
import Chat from "../models/Chat.js";
import { notifyNewEventCreated } from "./telegramService.js";

export async function createEvent({
  creatorId,
  title,
  description,
  startsAt,
  endsAt,
  place,
  coverImage,
  location,
}) {
  const creatorObjId = new mongoose.Types.ObjectId(creatorId);

  const chat = new Chat({
    type: "group",
    title,
    members: [creatorObjId],
  });
  await chat.save();

  const event = new Event({
    title,
    description: description?.trim() || undefined,
    startsAt: new Date(startsAt),
    endsAt: endsAt ? new Date(endsAt) : undefined,
    place,
    coverImage: coverImage || undefined,
    creatorId: creatorObjId,
    participants: [creatorObjId],
    chatId: chat._id,
    location:
      location &&
      typeof location === "object" &&
      (typeof location.latitude === "number" ||
        typeof location.longitude === "number")
        ? {
            latitude:
              typeof location.latitude === "number"
                ? location.latitude
                : undefined,
            longitude:
              typeof location.longitude === "number"
                ? location.longitude
                : undefined,
          }
        : undefined,
  });

  await event.save();

  await event.populate("creatorId", "name avatar");
  await event.populate("participants", "name avatar");

  const mapped = mapEvent(event);

  // Уведомление в Telegram о новом мероприятии (если настроены переменные окружения)
  try {
    await notifyNewEventCreated(mapped);
  } catch (error) {
    console.error("Failed to notify Telegram about new event:", error);
  }

  return mapped;
}

export async function listEvents() {
  const now = new Date();
  const events = await Event.find({
    startsAt: { $gte: now },
    status: { $ne: "cancelled" },
  })
    .sort({ startsAt: 1 })
    .populate("creatorId", "name avatar")
    .populate("participants", "name avatar");

  return events.map(mapEvent);
}

export async function getEventById(eventId) {
  const event = await Event.findById(eventId)
    .populate("creatorId", "name avatar")
    .populate("participants", "name avatar");

  if (!event) {
    const error = new Error("Мероприятие не найдено");
    error.status = 404;
    throw error;
  }

  return mapEvent(event);
}

export async function joinEvent({ eventId, userId }) {
  const userObjId = new mongoose.Types.ObjectId(userId);

  const event = await Event.findById(eventId);
  if (!event) {
    const error = new Error("Мероприятие не найдено");
    error.status = 404;
    throw error;
  }

  const alreadyParticipant = event.participants.some(
    (id) => id.toString() === userId
  );
  if (!alreadyParticipant) {
    event.participants.push(userObjId);
    await event.save();
  }

  if (event.chatId) {
    await Chat.updateOne(
      { _id: event.chatId },
      { $addToSet: { members: userObjId } }
    );
  }
  await event.populate("creatorId", "name avatar");
  await event.populate("participants", "name avatar");

  return mapEvent(event);
}

export async function leaveEvent({ eventId, userId }) {
  const userObjId = new mongoose.Types.ObjectId(userId);

  const event = await Event.findById(eventId);
  if (!event) {
    const error = new Error("Мероприятие не найдено");
    error.status = 404;
    throw error;
  }

  const isCreator = event.creatorId.toString() === userId;
  if (isCreator) {
    const error = new Error("Создатель не может покинуть своё мероприятие");
    error.status = 400;
    throw error;
  }

  event.participants = event.participants.filter(
    (id) => id.toString() !== userId
  );
  await event.save();

  if (event.chatId) {
    await Chat.updateOne(
      { _id: event.chatId },
      { $pull: { members: userObjId } }
    );
  }
  await event.populate("creatorId", "name avatar");
  await event.populate("participants", "name avatar");

  return mapEvent(event);
}

export async function cancelEvent({ eventId, userId }) {
  const event = await Event.findById(eventId);
  if (!event) {
    const error = new Error("Мероприятие не найдено");
    error.status = 404;
    throw error;
  }

  const isCreator = event.creatorId.toString() === userId;
  if (!isCreator) {
    const error = new Error("Только создатель может удалить мероприятие");
    error.status = 403;
    throw error;
  }

  if (event.status === "cancelled") {
    return mapEvent(event);
  }

  event.status = "cancelled";
  await event.save();

  await event.populate("creatorId", "name avatar");
  await event.populate("participants", "name avatar");

  return mapEvent(event);
}

export async function updateEvent({
  eventId,
  userId,
  title,
  description,
  startsAt,
  endsAt,
  place,
  coverImage,
  location,
}) {
  const event = await Event.findById(eventId);
  if (!event) {
    const error = new Error("Мероприятие не найдено");
    error.status = 404;
    throw error;
  }

  const isCreator = event.creatorId.toString() === userId;
  if (!isCreator) {
    const error = new Error("Только создатель может редактировать мероприятие");
    error.status = 403;
    throw error;
  }

  if (typeof title === "string") {
    event.title = title.trim();
  }

  if (description !== undefined) {
    event.description = description?.trim() || undefined;
  }

  if (startsAt !== undefined) {
    event.startsAt = new Date(startsAt);
  }

  if (endsAt !== undefined) {
    event.endsAt = endsAt ? new Date(endsAt) : undefined;
  }

  if (typeof place === "string") {
    event.place = place.trim();
  }

  if (coverImage !== undefined) {
    event.coverImage = coverImage || undefined;
  }

  if (location !== undefined) {
    event.location =
      location &&
      typeof location === "object" &&
      (typeof location.latitude === "number" ||
        typeof location.longitude === "number")
        ? {
            latitude:
              typeof location.latitude === "number"
                ? location.latitude
                : undefined,
            longitude:
              typeof location.longitude === "number"
                ? location.longitude
                : undefined,
          }
        : undefined;
  }

  await event.save();

  await event.populate("creatorId", "name avatar");
  await event.populate("participants", "name avatar");

  return mapEvent(event);
}

function mapEvent(eventDoc) {
  const event = eventDoc.toObject();

  return {
    id: event._id.toString(),
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    place: event.place,
    coverImage: event.coverImage,
    location: event.location
      ? {
          latitude: event.location.latitude,
          longitude: event.location.longitude,
        }
      : null,
    status: event.status,
    creatorId: event.creatorId?._id?.toString?.() || event.creatorId?.toString(),
    creator: event.creatorId && event.creatorId.name
      ? {
          id: event.creatorId._id.toString(),
          name: event.creatorId.name,
          avatar: event.creatorId.avatar,
        }
      : null,
    participants: Array.isArray(event.participants)
      ? event.participants.map((p) =>
          p && p.name
            ? {
                id: p._id.toString(),
                name: p.name,
                avatar: p.avatar,
              }
            : {
                id: p.toString(),
              }
        )
      : [],
    chatId: event.chatId ? event.chatId.toString() : null,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

