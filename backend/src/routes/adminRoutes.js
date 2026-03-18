import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import {
  getAdminUsersController,
  getAdminUserDetailsController,
  adminCancelEventController,
  adminCompleteEventController,
  listAdminEventsController,
  getAdminRemindersController,
  sendAdminReminderNowController,
  resetAdminReminderController,
  broadcastAdminController,
  statsUsersAdminController,
  statsEventsAdminController,
  getAdminAuditController,
} from "../controllers/adminController.js";

const router = express.Router();

// Все админ-эндпоинты
router.use(authMiddleware);
router.use(adminMiddleware);

// Пользователи
router.get("/users", getAdminUsersController);
router.get("/users/:id", getAdminUserDetailsController);

// Модерация событий
router.get("/events", listAdminEventsController);
router.post("/events/:id/cancel", adminCancelEventController);
router.post("/events/:id/complete", adminCompleteEventController);

// Напоминания
router.get("/reminders", getAdminRemindersController);
router.post("/reminders/:id/send", sendAdminReminderNowController);
router.post("/reminders/:id/reset", resetAdminReminderController);

// Рассылки
router.post("/broadcast", broadcastAdminController);

// Статистика
router.get("/stats/users", statsUsersAdminController);
router.get("/stats/events", statsEventsAdminController);

// Аудит действий
router.get("/audit", getAdminAuditController);

export default router;

