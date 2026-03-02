import { handleTelegramUpdate } from "../services/telegramService.js";

export async function telegramWebhook(req, res, next) {
  try {
    const update = req.body;

    // Telegram ждёт быстрый 200 OK — обрабатываем без долгих операций.
    await handleTelegramUpdate(update);

    // Всегда отвечаем 200, даже если ничего не сделали.
    res.sendStatus(200);
  } catch (error) {
    console.error("Telegram webhook error:", error);
    next(error);
  }
}

