import express from "express";
import { telegramWebhook } from "../controllers/telegramController.js";

const router = express.Router();

// Webhook для Telegram Bot API
// Полный путь: /telegram/webhook (через nginx: https://api.sector.moscow/telegram/webhook)
router.post("/webhook", telegramWebhook);

export default router;

