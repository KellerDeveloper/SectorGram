import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  health,
  suggestEventDescription,
  suggestMeetingIdea,
  improveText,
} from "../controllers/aiController.js";
import {
  suggestEventDescriptionValidation,
  suggestMeetingIdeaValidation,
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

/** Идеи куда сходить (для встречи) */
router.post(
  "/suggest-meeting-idea",
  authMiddleware,
  suggestMeetingIdeaValidation,
  suggestMeetingIdea
);

/** Улучшение/редактирование текста */
router.post(
  "/improve-text",
  authMiddleware,
  improveTextValidation,
  improveText
);

export default router;
