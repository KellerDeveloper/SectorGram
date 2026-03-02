const { TELEGRAM_BOT_TOKEN, TELEGRAM_WEBAPP_URL } = process.env;

const TELEGRAM_API_BASE = TELEGRAM_BOT_TOKEN
  ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
  : null;

async function callTelegramApi(method, payload) {
  if (!TELEGRAM_API_BASE) {
    console.error(
      "Telegram Bot API call skipped: TELEGRAM_BOT_TOKEN is not configured."
    );
    return null;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error("Telegram API error:", {
        method,
        status: response.status,
        data,
      });
    }

    return data;
  } catch (error) {
    console.error("Telegram API request failed:", error);
    return null;
  }
}

export async function sendTelegramMessage(chatId, text, extra = {}) {
  if (!chatId) return null;

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...extra,
  };

  return callTelegramApi("sendMessage", payload);
}

export async function handleTelegramUpdate(update) {
  if (!update) return;

  const message = update.message || update.edited_message;
  const chatId = message?.chat?.id;
  const text = message?.text;

  if (!chatId) {
    return;
  }

  const lowerText = typeof text === "string" ? text.toLowerCase() : "";

  if (lowerText.startsWith("/start")) {
    const webAppUrl =
      TELEGRAM_WEBAPP_URL?.trim() || "https://sector.moscow";

    const welcomeText =
      "Привет! 👋\n\n" +
      "Это бот проекта Sector. Нажми кнопку ниже, чтобы открыть мини‑приложение.";

    await sendTelegramMessage(chatId, welcomeText, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Открыть Sector",
              web_app: {
                url: webAppUrl,
              },
            },
          ],
        ],
      },
    });

    return;
  }

  // Для остальных сообщений пока просто молчим, чтобы не засорять чат.
}

