import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { registerPushToken } from "../controllers/notificationController.js";
import { registerPushTokenValidation } from "../validators/notificationValidators.js";

const router = express.Router();

router.use(authMiddleware);

// POST /notifications/register
router.post("/register", registerPushTokenValidation, registerPushToken);

export default router;


