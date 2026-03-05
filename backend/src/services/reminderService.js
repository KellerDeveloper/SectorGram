import Event from "../models/Event.js";
import EventReminder from "../models/EventReminder.js";
import { sendTelegramMessage } from "./telegramService.js";

const ONE_HOUR_MS = 60 * 60 * 1000;
const REMINDER_24H_MS = 24 * ONE_HOUR_MS;
const REMINDER_6H_MS = 6 * ONE_HOUR_MS;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // каждые 5 минут
const WINDOW_MS = 5 * 60 * 1000; // ±5 минут от нужного момента

function formatEventDateTime(date) {
  try {
    const d = new Date(date);
    return d.toLocaleString("ru-RU", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function buildReminderText(event, hoursBefore) {
  const when =
    hoursBefore === 24
      ? "завтра"
      : `через ${hoursBefore} часов`;

  const dateStr = event.startsAt ? formatEventDateTime(event.startsAt) : "";

  const lines = [];
  lines.push(`Напоминание о мероприятии SEKTOR ${when}.`);
  if (event.title) {
    lines.push("");
    lines.push(`Название: ${event.title}`);
  }
  if (dateStr) {
    lines.push(`Время: ${dateStr}`);
  }
  if (event.place) {
    lines.push(`Место: ${event.place}`);
  }
  lines.push("");
  lines.push(
    "Откройте мини‑приложение SEKTOR, чтобы посмотреть детали события."
  );

  return lines.join("\n");
}

function buildYandexRouteUrl(event) {
  if (
    event?.location &&
    typeof event.location.latitude === "number" &&
    typeof event.location.longitude === "number"
  ) {
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

async function processEventsForOffset(offsetMs, flagField, hoursBefore) {
  const now = new Date();
  const from = new Date(now.getTime() + offsetMs - WINDOW_MS);
  const to = new Date(now.getTime() + offsetMs + WINDOW_MS);

  try {
    const events = await Event.find({
      startsAt: { $gte: from, $lte: to },
      status: { $ne: "cancelled" },
      [flagField]: { $ne: true },
    })
      .populate("participants", "telegramId name")
      .lean(false); // получаем документы Mongoose, чтобы потом сохранить

    for (const event of events) {
      const participants = Array.isArray(event.participants)
        ? event.participants
        : [];

      const telegramUsers = participants.filter(
        (p) => p && typeof p.telegramId === "string" && p.telegramId.trim()
      );

      if (!telegramUsers.length) {
        // Просто отмечаем флаг, чтобы не пытаться ещё раз
        event[flagField] = true;
        await event.save();
        continue;
      }

      const text = buildReminderText(event, hoursBefore);
      const routeUrl = buildYandexRouteUrl(event);

      for (const user of telegramUsers) {
        try {
          const extra =
            hoursBefore === 6
              ? {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "Напомнить за 1 час",
                          callback_data: `event_remind_1h:${event._id.toString()}`,
                        },
                        {
                          text: "Напомнить за 3 часа",
                          callback_data: `event_remind_3h:${event._id.toString()}`,
                        },
                      ],
                      ...(routeUrl
                        ? [
                            [
                              {
                                text: "Построить маршрут",
                                url: routeUrl,
                              },
                            ],
                          ]
                        : []),
                    ],
                  },
                }
              : {};

          await sendTelegramMessage(user.telegramId, text, extra);
        } catch (error) {
          // Логируем, но продолжаем другим пользователям
          console.error(
            `Failed to send Telegram reminder to user ${user._id} for event ${event._id}:`,
            error
          );
        }
      }

      event[flagField] = true;
      await event.save();
    }
  } catch (error) {
    console.error(
      `Error while processing ${hoursBefore}h reminders:`,
      error
    );
  }
}

async function processUserReminders() {
  const now = new Date();
  const from = new Date(now.getTime() - WINDOW_MS);
  const to = new Date(now.getTime() + WINDOW_MS);

  try {
    const reminders = await EventReminder.find({
      sent: { $ne: true },
      remindAt: { $gte: from, $lte: to },
    })
      .populate("eventId")
      .populate("userId", "telegramId name")
      .lean(false);

    for (const reminder of reminders) {
      const event = reminder.eventId;
      const user = reminder.userId;

      if (!event || !user) {
        reminder.sent = true;
        await reminder.save();
        continue;
      }

      if (!user.telegramId) {
        reminder.sent = true;
        await reminder.save();
        continue;
      }

      const hoursBefore = reminder.type === "1h" ? 1 : 3;
      const text = buildReminderText(event, hoursBefore);

      try {
        await sendTelegramMessage(user.telegramId, text);
      } catch (error) {
        console.error(
          `Failed to send user-specific reminder (type=${reminder.type}) to user ${user._id} for event ${event._id}:`,
          error
        );
      }

      reminder.sent = true;
      await reminder.save();
    }
  } catch (error) {
    console.error(
      "Error while processing user-specific event reminders:",
      error
    );
  }
}

async function checkAndSendEventReminders() {
  await processEventsForOffset(REMINDER_24H_MS, "reminder24hSent", 24);
  await processEventsForOffset(REMINDER_6H_MS, "reminder6hSent", 6);
  await processUserReminders();
}

let intervalHandle = null;

export function startEventRemindersScheduler() {
  if (intervalHandle) {
    return;
  }

  // Первый запуск с небольшой задержкой после старта сервера
  setTimeout(() => {
    checkAndSendEventReminders().catch((error) => {
      console.error("Initial event reminders check failed:", error);
    });
  }, 15 * 1000);

  intervalHandle = setInterval(() => {
    checkAndSendEventReminders().catch((error) => {
      console.error("Periodic event reminders check failed:", error);
    });
  }, CHECK_INTERVAL_MS);
}

