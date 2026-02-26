import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getOnlineUsersController,
  searchUsersController,
  getMeController,
} from "../controllers/userController.js";
import { userSearchValidation } from "../validators/userValidators.js";

const router = express.Router();

router.use(authMiddleware);

// GET /users/online
router.get("/online", getOnlineUsersController);

// GET /users/search
router.get("/search", userSearchValidation, searchUsersController);

// GET /users/me
router.get("/me", getMeController);

export default router;


