// Хранилище онлайн-статуса и комнат пользователя

export const onlineUsers = new Map(); // userId -> Set<socketId>
export const userRooms = new Map(); // userId -> Set<chatId>

export function markUserOnline(userId, socketId) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
}

export function markUserOffline(userId, socketId) {
  const sockets = onlineUsers.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      onlineUsers.delete(userId);
    }
  }
}

export function isUserOnline(userId) {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

export function getOnlineUsers(userIds) {
  return userIds.filter((id) => isUserOnline(id.toString()));
}

export function addUserRoom(userId, chatId) {
  if (!userRooms.has(userId)) {
    userRooms.set(userId, new Set());
  }
  userRooms.get(userId).add(chatId);
}

export function removeUserRoom(userId, chatId) {
  const rooms = userRooms.get(userId);
  if (rooms) {
    rooms.delete(chatId);
  }
}

export function getUserRooms(userId) {
  return Array.from(userRooms.get(userId) || []);
}

