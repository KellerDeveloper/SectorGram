import User from "../models/User.js";

export async function registerPushToken(req, res, next) {
  try {
    const userId = req.user.id;
    const { expoPushToken } = req.body || {};

    if (!expoPushToken || typeof expoPushToken !== "string") {
      const error = new Error("expoPushToken обязателен");
      error.status = 400;
      throw error;
    }

    await User.findByIdAndUpdate(
      userId,
      { expoPushToken },
      { new: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Ошибка сохранения Expo Push Token:", error);
    next(error);
  }
}

