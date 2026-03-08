import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  health,
  suggestEventDescription,
  improveText,
} from "../controllers/aiController.js";
import {
  suggestEventDescriptionValidation,
  improveTextValidation,
} from "../validators/aiValidators.js";

const router = express.Router();

/** Проверка доступности YandexGPT (без генерации). Доступно авторизованным. */
router.get("/health", authMiddleware, health);

/** Подсказка описания мероприятия по title, place, draft */
router.post(
  "/suggest-event-description",
  authMiddleware,
  suggestEventDescriptionValidation,
  suggestEventDescription
);

/** Улучшение/редактирование текста */
router.post(
  "/improve-text",
  authMiddleware,
  improveTextValidation,
  improveText
);

export default router;
