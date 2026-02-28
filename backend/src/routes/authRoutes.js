import express from "express";
import { register, login, googleAuth } from "../controllers/authController.js";
import {
  registerValidation,
  loginValidation,
  googleAuthValidation,
} from "../validators/authValidators.js";

const router = express.Router();

// POST /auth/register
router.post("/register", registerValidation, register);

// POST /auth/login
router.post("/login", loginValidation, login);

// POST /auth/google — вход/регистрация по Google id_token с клиента
router.post("/google", googleAuthValidation, googleAuth);

export default router;


