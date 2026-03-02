import express from "express";
import {
  register,
  login,
  googleAuth,
  telegramWebAppAuth,
} from "../controllers/authController.js";
import {
  registerValidation,
  loginValidation,
  googleAuthValidation,
  telegramWebAppValidation,
} from "../validators/authValidators.js";

const router = express.Router();

// POST /auth/register
router.post("/register", registerValidation, register);

// POST /auth/login
router.post("/login", loginValidation, login);

// POST /auth/google — вход/регистрация по Google id_token с клиента
router.post("/google", googleAuthValidation, googleAuth);

// POST /auth/telegram-webapp — вход/регистрация по initData из Telegram WebApp
router.post("/telegram-webapp", telegramWebAppValidation, telegramWebAppAuth);

export default router;


