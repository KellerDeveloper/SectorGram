import {
  registerUser,
  loginUser,
  loginOrRegisterWithGoogle,
  loginOrRegisterWithTelegramWebApp,
} from "../services/authService.js";

export async function register(req, res, next) {
  try {
    const { email, password, name } = req.body || {};
    const result = await registerUser({ email, password, name });
    res.json(result);
  } catch (error) {
    console.error("Ошибка регистрации:", error);
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const result = await loginUser({ email, password });
    res.json(result);
  } catch (error) {
    console.error("Ошибка входа:", error);
    next(error);
  }
}

export async function googleAuth(req, res, next) {
  try {
    const idToken = (req.body?.id_token ?? req.body?.idToken) || "";
    const result = await loginOrRegisterWithGoogle(idToken);
    res.json(result);
  } catch (error) {
    console.error("Ошибка входа через Google:", error);
    next(error);
  }
}

export async function telegramWebAppAuth(req, res, next) {
  try {
    const initData = req.body?.initData || req.body?.init_data || "";
    const result = await loginOrRegisterWithTelegramWebApp(initData);
    res.json(result);
  } catch (error) {
    console.error("Ошибка входа через Telegram WebApp:", error);
    next(error);
  }
}


