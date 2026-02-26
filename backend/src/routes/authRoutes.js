import express from "express";
import { register, login } from "../controllers/authController.js";
import {
  registerValidation,
  loginValidation,
} from "../validators/authValidators.js";

const router = express.Router();

// POST /auth/register
router.post("/register", registerValidation, register);

// POST /auth/login
router.post("/login", loginValidation, login);

export default router;


