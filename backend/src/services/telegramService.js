import crypto from "crypto";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";

const { TELEGRAM_BOT_TOKEN, TELEGRAM_WEBAPP_URL } = process.env;
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || null;
const TELEGRAM_WEBAPP_DEEPLINK =
  process.env.TELEGRAM_WEBAPP_DEEPLINK ||
  "https://t.me/sektor_moscow_bot/sektor_events";
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

async function replaceCallbackMessage(callback, text, extra = {}) {
  const chatId = callback.message?.chat?.id;
  const messageId = callback.message?.message_id;

  if (!chatId) return null;

  // Пытаемся удалить предыдущее сообщение бота, чтобы не спамить
  if (messageId) {
    try {
      await callTelegramApi("deleteMessage", {
        chat_id: chatId,
        message_id: messageId,
      });
    } catch (error) {
      console.error("Failed to delete Telegram message:", error);
    }
  }

  return sendTelegramMessage(chatId, text, extra);
}

function getWebAppUrl() {
  return TELEGRAM_WEBAPP_URL?.trim() || "https://sektor.moscow";
}

function buildOpenAppButton(chatType, text = "Открыть приложение") {
  return {
    text,
    url: TELEGRAM_WEBAPP_DEEPLINK,
  };
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

  const webAppUrl = getWebAppUrl();
  lines.push(`Открыть в приложении: ${webAppUrl}`);

  const text = lines.join("\n");

  try {
    const extra = {
      reply_markup: {
        inline_keyboard: [[buildOpenAppButton("group", "Открыть приложение")]],
      },
    };
    if (TELEGRAM_EVENT_TOPIC_ID && !Number.isNaN(TELEGRAM_EVENT_TOPIC_ID)) {
      extra.message_thread_id = TELEGRAM_EVENT_TOPIC_ID;
    }

    const result = await sendTelegramMessage(
      TELEGRAM_EVENT_CHAT_ID,
      text,
      extra
    );

    // Если тема закрыта — пробуем отправить без message_thread_id в общий чат
    if (
      result &&
      result.ok === false &&
      result.error_code === 400 &&
      typeof result.description === "string" &&
      result.description.includes("TOPIC_CLOSED") &&
      extra.message_thread_id
    ) {
      console.warn(
        "Telegram topic is closed, retrying notifyNewEventCreated without thread id"
      );
      await sendTelegramMessage(TELEGRAM_EVENT_CHAT_ID, text, {
        reply_markup: {
          inline_keyboard: [
            [buildOpenAppButton("group", "Открыть приложение")],
          ],
        },
      });
    }
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
    const chatType = callback.message?.chat?.type;

    const telegramUserId = callback.from?.id ? String(callback.from.id) : null;

    if (!chatId) {
      return;
    }

    // Вернуться к списку мероприятий
    if (data === "events:list") {
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
          await replaceCallbackMessage(
            callback,
            "Пока нет предстоящих мероприятий."
          );

          await callTelegramApi("answerCallbackQuery", {
            callback_query_id: callback.id,
          });
          return;
        }

        const buttons = events.map((ev) => {
          const dateStr = ev.startsAt ? formatEventDate(ev.startsAt) : "";
          const title = escapeHtml(ev.title) || "Мероприятие";
          const subtitle = dateStr ? `\n${dateStr}` : "";
          const text = title + subtitle;

          return [
            {
              text,
              callback_data: `event:${ev._id.toString()}`,
            },
          ];
        });

        const openButtonInList = buildOpenAppButton(
          chatType,
          "Открыть приложение"
        );

        const header =
          "Ближайшие мероприятия Sektor.\nВыберите одно из списка, чтобы посмотреть подробности:";

        await replaceCallbackMessage(callback, header, {
          reply_markup: {
            inline_keyboard: [...buttons, [openButtonInList]],
          },
        });

        await callTelegramApi("answerCallbackQuery", {
          callback_query_id: callback.id,
        });
      } catch (error) {
        console.error("Failed to handle events:list callback:", error);
        await callTelegramApi("answerCallbackQuery", {
          callback_query_id: callback.id,
          text: "Не удалось обновить список мероприятий",
          show_alert: true,
        });
      }

      return;
    }

    // Пользователь отметил, что идёт на мероприятие
    if (data.startsWith("event_join:")) {
      const eventId = data.slice("event_join:".length).trim();

      try {
        if (!telegramUserId) {
          await callTelegramApi("answerCallbackQuery", {
            callback_query_id: callback.id,
            text: "Не удалось определить пользователя Telegram.",
            show_alert: true,
          });
          return;
        }

        const user = await User.findOne({ telegramId: telegramUserId });
        if (!user) {
          await callTelegramApi("answerCallbackQuery", {
            callback_query_id: callback.id,
            text: "Сначала откройте мини‑приложение Sektor, чтобы привязать аккаунт.",
            show_alert: true,
          });
          return;
        }

        const event = await Event.findById(eventId);
        if (!event) {
          await callTelegramApi("answerCallbackQuery", {
            callback_query_id: callback.id,
            text: "Мероприятие не найдено",
            show_alert: true,
          });
          return;
        }

        const alreadyParticipant = event.participants.some(
          (id) => id.toString() === user._id.toString()
        );

        if (!alreadyParticipant) {
          event.participants.push(user._id);
          await event.save();

          if (event.chatId) {
            await Chat.updateOne(
              { _id: event.chatId },
              { $addToSet: { members: user._id } }
            );
          }

          await callTelegramApi("answerCallbackQuery", {
            callback_query_id: callback.id,
            text: "Вы записаны на мероприятие!",
            show_alert: false,
          });
        } else {
          await callTelegramApi("answerCallbackQuery", {
            callback_query_id: callback.id,
            text: "Вы уже записаны на это мероприятие.",
            show_alert: false,
          });
        }
      } catch (error) {
        console.error("Failed to handle event_join callback:", error);
        await callTelegramApi("answerCallbackQuery", {
          callback_query_id: callback.id,
          text: "Ошибка при записи на мероприятие",
          show_alert: true,
        });
      }

      return;
    }

    // Пользователь запросил список участников мероприятия
    if (data.startsWith("event_participants:")) {
      const eventId = data.slice("event_participants:".length).trim();

      try {
        const event = await Event.findById(eventId).populate(
          "participants",
          "name username telegramId"
        );

        if (!event) {
          await callTelegramApi("answerCallbackQuery", {
            callback_query_id: callback.id,
            text: "Мероприятие не найдено",
            show_alert: true,
          });
          return;
        }

        const participants = Array.isArray(event.participants)
          ? event.participants
          : [];

        let text;

        if (!participants.length) {
          text = "На это мероприятие пока никто не записался.";
        } else {
          const lines = [];
          lines.push("Участники мероприятия:");
          lines.push("");

          for (const p of participants) {
            const name =
              (p && p.name && String(p.name).trim()) || "Участник";
            const username =
              p && p.username && String(p.username).trim();
            const telegramId =
              p && p.telegramId && String(p.telegramId).trim();

            // Делаем «тег»: при наличии telegramId даём кликабельную ссылку,
            // в тексте показываем @username или имя.
            if (telegramId) {
              const label = username ? `@${username}` : name;
              const safeLabel = escapeHtml(label);
              lines.push(
                `• <a href="tg://user?id=${telegramId}">${safeLabel}</a>`
              );
            } else if (username) {
              lines.push(`• @${escapeHtml(username)}`);
            } else {
              lines.push(`• ${escapeHtml(name)}`);
            }
          }

          text = lines.join("\n");
        }

        const openButtonInParticipants = buildOpenAppButton(
          chatType,
          "Открыть приложение"
        );

        const replyMarkup = {
          inline_keyboard: [
            [
              {
                text: "Назад к мероприятию",
                callback_data: `event:${event._id.toString()}`,
              },
            ],
            [
              {
                text: "Назад к списку мероприятий",
                callback_data: "events:list",
              },
            ],
            [openButtonInParticipants],
          ],
        };

        await replaceCallbackMessage(callback, text, {
          reply_markup: replyMarkup,
        });

        await callTelegramApi("answerCallbackQuery", {
          callback_query_id: callback.id,
        });
      } catch (error) {
        console.error("Failed to handle event_participants callback:", error);
        await callTelegramApi("answerCallbackQuery", {
          callback_query_id: callback.id,
          text: "Ошибка при получении списка участников",
          show_alert: true,
        });
      }

      return;
    }

    // Показ подробностей мероприятия
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
        const firstRow = [];

        if (routeUrl) {
          firstRow.push({
            text: "Построить маршрут",
            url: routeUrl,
          });
        }

        firstRow.push(buildOpenAppButton(chatType, "Открыть приложение"));

        const secondRow = [
          {
            text: "Я иду",
            callback_data: `event_join:${event._id.toString()}`,
          },
          {
            text: "Список участников",
            callback_data: `event_participants:${event._id.toString()}`,
          },
        ];

        const thirdRow = [
          {
            text: "Назад к списку мероприятий",
            callback_data: "events:list",
          },
        ];

        const inlineKeyboard = [];
        if (firstRow.length) {
          inlineKeyboard.push(firstRow);
        }
        inlineKeyboard.push(secondRow);
        inlineKeyboard.push(thirdRow);

        const replyMarkup =
          inlineKeyboard.length > 0
            ? {
                inline_keyboard: inlineKeyboard,
              }
            : undefined;

        await replaceCallbackMessage(
          callback,
          text,
          replyMarkup ? { reply_markup: replyMarkup } : {}
        );

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
  const chatType = message?.chat?.type;
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
      "Это бот проекта Sektor. Нажми кнопку ниже, чтобы открыть приложение.\n\n" +
      "Команды:\n" +
      "/events — список ближайших мероприятий.";

    const openButton = buildOpenAppButton(chatType, "Открыть приложение");

    await sendTelegramMessage(chatId, welcomeText, {
      reply_markup: {
        inline_keyboard: [[openButton]],
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
        const openButtonNoEvents = buildOpenAppButton(
          chatType,
          "Открыть приложение"
        );

        await sendTelegramMessage(chatId, "Пока нет предстоящих мероприятий.", {
          reply_markup: {
            inline_keyboard: [[openButtonNoEvents]],
          },
        });
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

      const openButtonInEventsList = buildOpenAppButton(
        chatType,
        "Открыть приложение"
      );

      await sendTelegramMessage(chatId, header, {
        reply_markup: {
          inline_keyboard: [...buttons, [openButtonInEventsList]],
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

