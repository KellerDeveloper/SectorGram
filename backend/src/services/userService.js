import mongoose from "mongoose";
import User from "../models/User.js";
import Event from "../models/Event.js";

export async function getOnlineUsersDetailed(onlineIds) {
  const users = await User.find({ _id: { $in: onlineIds } }).select(
    "name email avatar"
  );

  return users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    isOnline: true,
  }));
}

export async function searchUsers({ query, currentUserId, isUserOnline }) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchQuery = query.trim();

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

  return users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    username: user.username,
    isOnline: isUserOnline(user._id.toString()),
  }));
}

export async function getCurrentUser(userId) {
  const user = await User.findById(new mongoose.Types.ObjectId(userId));

  if (!user) {
    const error = new Error("Пользователь не найден");
    error.status = 404;
    throw error;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
  };
}

export async function getUserRatings({ limit = 50 } = {}) {
  const now = new Date();

  // Учитываем только прошедшие мероприятия:
  // - старт уже наступил (`startsAt <= now`)
  // - если `endsAt` задан — он тоже уже наступил (`endsAt <= now`)
  // - если `endsAt` не задан — считаем событие прошедшим только по `startsAt`
  const baseMatch = {
    status: { $ne: "cancelled" },
    startsAt: { $lte: now },
    $or: [
      { endsAt: { $exists: false } },
      { endsAt: null },
      { endsAt: { $lte: now } },
    ],
  };

  // Кол-во созданных мероприятий по пользователю
  const creatorsAgg = await Event.aggregate([
    { $match: baseMatch },
    {
      $group: {
        _id: "$creatorId",
        createdCount: { $sum: 1 },
      },
    },
  ]);

  // Кол-во посещённых мероприятий по пользователю
  const participantsAgg = await Event.aggregate([
    { $match: baseMatch },
    { $unwind: "$participants" },
    {
      $group: {
        _id: "$participants",
        attendedCount: { $sum: 1 },
      },
    },
  ]);

  // «Заинтересованность» — сколько людей пришло на мероприятия конкретного создателя
  // Для каждого события считаем размер массива participants и суммируем по creatorId.
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
    {
      $group: {
        _id: "$creatorId",
        totalParticipantsOnCreatedEvents: { $sum: "$participantsCount" },
      },
    },
  ]);

  const statsByUserId = new Map();

  for (const item of creatorsAgg) {
    const userId = String(item._id);
    const existing = statsByUserId.get(userId) || {
      userId,
      createdCount: 0,
      attendedCount: 0,
      interestScore: 0,
    };
    existing.createdCount += item.createdCount || 0;
    statsByUserId.set(userId, existing);
  }

  for (const item of participantsAgg) {
    const userId = String(item._id);
    const existing = statsByUserId.get(userId) || {
      userId,
      createdCount: 0,
      attendedCount: 0,
      interestScore: 0,
    };
    existing.attendedCount += item.attendedCount || 0;
    statsByUserId.set(userId, existing);
  }

  for (const item of interestAgg) {
    const userId = String(item._id);
    const existing = statsByUserId.get(userId) || {
      userId,
      createdCount: 0,
      attendedCount: 0,
      interestScore: 0,
    };
    existing.interestScore += item.totalParticipantsOnCreatedEvents || 0;
    statsByUserId.set(userId, existing);
  }

  if (!statsByUserId.size) {
    return [];
  }

  const userIds = Array.from(statsByUserId.keys()).map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  const users = await User.find({ _id: { $in: userIds } }).select(
    "name avatar username"
  );

  const usersById = new Map(
    users.map((u) => [u._id.toString(), u])
  );

  const withScores = Array.from(statsByUserId.values())
    .map((stat) => {
      const user = usersById.get(stat.userId);
      if (!user) {
        return null;
      }

      const createdEvents = stat.createdCount || 0;
      const attendedEvents = stat.attendedCount || 0;
      const interestScore = stat.interestScore || 0;

      // Итоговый рейтинг:
      //  - +1 за каждое созданное мероприятие
      //  - +1 за каждое посещённое мероприятие
      //  - +1 за каждого участника на созданных пользователем мероприятиях
      const score = createdEvents + attendedEvents + interestScore;

      return {
        userId: stat.userId,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        createdEvents,
        attendedEvents,
        interestScore,
        ratingScore: score,
      };
    })
    .filter(Boolean);

  withScores.sort((a, b) => {
    if (b.ratingScore !== a.ratingScore) {
      return b.ratingScore - a.ratingScore;
    }
    if (b.createdEvents !== a.createdEvents) {
      return b.createdEvents - a.createdEvents;
    }
    return b.attendedEvents - a.attendedEvents;
  });

  return withScores.slice(0, limit);
}

