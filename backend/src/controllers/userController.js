import {
  getOnlineUsersDetailed,
  searchUsers,
  getCurrentUser,
} from "../services/userService.js";
import { getUserRatings } from "../services/userService.js";

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

export async function getUserRatingsController(req, res, next) {
  try {
    const limitRaw = req.query.limit;
    let limit = 50;

    if (typeof limitRaw === "string") {
      const parsed = Number.parseInt(limitRaw, 10);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 200) {
        limit = parsed;
      }
    }

    const ratings = await getUserRatings({ limit });

    res.json({
      items: ratings,
    });
  } catch (error) {
    console.error("Ошибка получения рейтинга пользователей:", error);
    next(error);
  }
}

