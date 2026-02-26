import mongoose from "mongoose";
import User from "../models/User.js";

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

