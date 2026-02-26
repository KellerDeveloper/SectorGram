import {
  getOnlineUsersDetailed,
  searchUsers,
  getCurrentUser,
} from "../services/userService.js";

export async function getOnlineUsersController(req, res, next) {
  try {
    const onlineIds = Array.from(req.app.locals.onlineUsers.keys());
    const users = await getOnlineUsersDetailed(onlineIds);

    res.json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Ошибка получения онлайн пользователей:", error);
    next(error);
  }
}

export async function searchUsersController(req, res, next) {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id;
    const { isUserOnline } = req.app.locals.chatHelpers;

    const users = await searchUsers({
      query: q,
      currentUserId,
      isUserOnline,
    });

    res.json({ users });
  } catch (error) {
    console.error("Ошибка поиска пользователей:", error);
    next(error);
  }
}

export async function getMeController(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await getCurrentUser(userId);
    res.json(user);
  } catch (error) {
    console.error("Ошибка получения текущего пользователя:", error);
    next(error);
  }
}

