import crypto from "crypto";

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

/**
 * Проверка initData из Telegram WebApp согласно документации:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
export function validateTelegramWebAppInitData(initData) {
  if (!initData || typeof initData !== "string") {
    return null;
  }

  if (!TELEGRAM_BOT_TOKEN) {
    console.error(
      "Telegram WebApp auth skipped: TELEGRAM_BOT_TOKEN is not configured."
    );
    return null;
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    console.error("Telegram WebApp auth error: hash is missing");
    return null;
  }

  const dataCheckArr = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    dataCheckArr.push(`${key}=${value}`);
  }
  dataCheckArr.sort();

  const dataCheckString = dataCheckArr.join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(TELEGRAM_BOT_TOKEN)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computedHash !== hash) {
    console.error("Telegram WebApp auth error: hash mismatch");
    return null;
  }

  const userJson = params.get("user");
  let user = null;
  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch (e) {
      console.error("Telegram WebApp auth error: failed to parse user JSON");
      return null;
    }
  }

  const authDate = Number(params.get("auth_date") || "0");

  return {
    user,
    queryId: params.get("query_id") || null,
    authDate,
    raw: initData,
  };
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
      TELEGRAM_WEBAPP_URL?.trim() || "https://sektor.moscow";

    const welcomeText =
      "Привет! 👋\n\n" +
      "Это бот проекта Sektor. Нажми кнопку ниже, чтобы открыть мини‑приложение.";

    await sendTelegramMessage(chatId, welcomeText, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Открыть Sektor",
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

