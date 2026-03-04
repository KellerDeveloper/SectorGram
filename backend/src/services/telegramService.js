import crypto from "crypto";
import Event from "../models/Event.js";

const { TELEGRAM_BOT_TOKEN, TELEGRAM_WEBAPP_URL } = process.env;
const TELEGRAM_EVENT_CHAT_ID = process.env.TELEGRAM_EVENT_CHAT_ID || null;
const TELEGRAM_EVENT_TOPIC_ID = process.env.TELEGRAM_EVENT_TOPIC_ID
  ? Number(process.env.TELEGRAM_EVENT_TOPIC_ID)
  : null;

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

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatEventDate(startsAt) {
  try {
    const date = new Date(startsAt);
    return date.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function buildYandexRouteUrl(event) {
  if (event?.location && typeof event.location.latitude === "number" && typeof event.location.longitude === "number") {
    const lat = event.location.latitude;
    const lon = event.location.longitude;
    return `https://yandex.ru/maps/?rtext=~${lat},${lon}`;
  }

  if (event?.place) {
    const query = encodeURIComponent(event.place);
    return `https://yandex.ru/maps/?text=${query}`;
  }

  return null;
}

export async function notifyNewEventCreated(event) {
  if (!TELEGRAM_EVENT_CHAT_ID) {
    return;
  }

  if (!event || !event.id) {
    return;
  }

  const lines = [];
  lines.push("Новое мероприятие ✨");
  lines.push("");
  lines.push(`<b>${escapeHtml(event.title)}</b>`);

  if (event.startsAt) {
    const formatted = formatEventDate(event.startsAt);
    if (formatted) {
      lines.push(`🕒 ${formatted}`);
    }
  }

  if (event.place) {
    lines.push(`📍 ${escapeHtml(event.place)}`);
  }

  lines.push("");

  const webAppUrl = TELEGRAM_WEBAPP_URL?.trim() || "https://sektor.moscow";
  lines.push(`Открыть в мини‑карте: ${webAppUrl}`);

  const text = lines.join("\n");

  const extra = {};
  if (TELEGRAM_EVENT_TOPIC_ID && !Number.isNaN(TELEGRAM_EVENT_TOPIC_ID)) {
    extra.message_thread_id = TELEGRAM_EVENT_TOPIC_ID;
  }

  try {
    await sendTelegramMessage(TELEGRAM_EVENT_CHAT_ID, text, extra);
  } catch (error) {
    console.error("Failed to send new event notification to Telegram:", error);
  }
}

export async function handleTelegramUpdate(update) {
  if (!update) return;

  // Обработка callback_query (нажатия на inline‑кнопки)
  if (update.callback_query) {
    const callback = update.callback_query;
    const data = callback.data || "";
    const chatId = callback.message?.chat?.id;

    if (!chatId) {
      return;
    }

    if (data.startsWith("event:")) {
      const eventId = data.slice("event:".length).trim();

      try {
        const event = await Event.findById(eventId);
        if (!event) {
          await callTelegramApi("answerCallbackQuery", {
            callback_query_id: callback.id,
            text: "Мероприятие не найдено",
            show_alert: true,
          });
          return;
        }

        const lines = [];
        lines.push(`<b>${escapeHtml(event.title)}</b>`);

        if (event.startsAt) {
          const formatted = formatEventDate(event.startsAt);
          if (formatted) {
            lines.push(`🕒 ${formatted}`);
          }
        }

        if (event.place) {
          lines.push(`📍 ${escapeHtml(event.place)}`);
        }

        if (event.description) {
          lines.push("");
          lines.push(escapeHtml(event.description));
        }

        const text = lines.join("\n");

        const routeUrl = buildYandexRouteUrl(event);
        const replyMarkup = routeUrl
          ? {
              inline_keyboard: [
                [
                  {
                    text: "Построить маршрут",
                    url: routeUrl,
                  },
                ],
              ],
            }
          : undefined;

        await sendTelegramMessage(chatId, text, replyMarkup ? { reply_markup: replyMarkup } : {});

        await callTelegramApi("answerCallbackQuery", {
          callback_query_id: callback.id,
        });
      } catch (error) {
        console.error("Failed to handle event callback:", error);
        await callTelegramApi("answerCallbackQuery", {
          callback_query_id: callback.id,
          text: "Ошибка при получении мероприятия",
          show_alert: true,
        });
      }
    } else {
      await callTelegramApi("answerCallbackQuery", {
        callback_query_id: callback.id,
      });
    }

    return;
  }

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
      "Это бот проекта Sektor. Нажми кнопку ниже, чтобы открыть мини‑приложение.\n\n" +
      "Команды:\n" +
      "/events — список ближайших мероприятий.";

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

  if (lowerText.startsWith("/events")) {
    try {
      const now = new Date();
      const events = await Event.find({
        startsAt: { $gte: now },
        status: { $ne: "cancelled" },
      })
        .sort({ startsAt: 1 })
        .limit(10)
        .lean();

      if (!events.length) {
        await sendTelegramMessage(
          chatId,
          "Пока нет предстоящих мероприятий."
        );
        return;
      }

      const buttons = events.map((ev) => {
        const dateStr = ev.startsAt ? formatEventDate(ev.startsAt) : "";
        const title = escapeHtml(ev.title) || "Мероприятие";
        const subtitle = dateStr ? `\n${dateStr}` : "";
        const text = title + subtitle;

        // Telegram допускает до 64 байт в callback_data — id с префиксом умещается.
        return [
          {
            text,
            callback_data: `event:${ev._id.toString()}`,
          },
        ];
      });

      const header =
        "Ближайшие мероприятия Sektor.\nВыберите одно из списка, чтобы посмотреть подробности:";

      await sendTelegramMessage(chatId, header, {
        reply_markup: {
          inline_keyboard: buttons,
        },
      });
    } catch (error) {
      console.error("Failed to handle /events command:", error);
      await sendTelegramMessage(
        chatId,
        "Не удалось получить список мероприятий. Попробуйте позже."
      );
    }

    return;
  }

  // Для остальных сообщений пока просто молчим, чтобы не засорять чат.
}

