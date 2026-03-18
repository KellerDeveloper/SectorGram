import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getOnlineUsersController,
  searchUsersController,
  getMeController,
  getUserRatingsController,
} from "../controllers/userController.js";
import { userSearchValidation } from "../validators/userValidators.js";

const router = express.Router();

// GET /users/ratings
// Доступно всем (без авторизации) — показываем рейтинг в миниапке.
router.get("/ratings", getUserRatingsController);

// GET /users/online
router.get("/online", getOnlineUsersController);

// GET /users/search
router.get("/search", userSearchValidation, searchUsersController);

// GET /users/me
router.get("/me", getMeController);

router.use(authMiddleware);

export default router;


