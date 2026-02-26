import { registerUser, loginUser } from "../services/authService.js";

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

