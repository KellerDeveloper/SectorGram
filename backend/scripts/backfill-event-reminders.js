import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";
import Event from "../src/models/Event.js";
import EventReminder from "../src/models/EventReminder.js";

const ONE_HOUR_MS = 60 * 60 * 1000;

async function backfillEventReminders() {
  await connectDatabase();

  const now = new Date();

  console.log("🔎 Поиск будущих мероприятий для создания напоминаний...");

  const events = await Event.find({
    startsAt: { $gte: now },
    status: { $ne: "cancelled" },
  }).populate("participants", "telegramId name");

  console.log(`Найдено мероприятий: ${events.length}`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedPastRemindAt = 0;

  for (const event of events) {
    if (!event.startsAt) {
      continue;
    }

    const startsAtDate = new Date(event.startsAt);
    if (Number.isNaN(startsAtDate.getTime())) {
      continue;
    }

    const participants = Array.isArray(event.participants)
      ? event.participants
      : [];

    const telegramUsers = participants.filter(
      (p) => p && typeof p.telegramId === "string" && p.telegramId.trim()
    );

    if (!telegramUsers.length) {
      continue;
    }

    for (const user of telegramUsers) {
      for (const { type, hours } of [
        { type: "1h", hours: 1 },
        { type: "3h", hours: 3 },
      ]) {
        const remindAt = new Date(
          startsAtDate.getTime() - hours * ONE_HOUR_MS
        );

        // Не создаём напоминания "задним числом"
        if (remindAt.getTime() <= now.getTime()) {
          skippedPastRemindAt += 1;
          continue;
        }

        const existing = await EventReminder.findOneAndUpdate(
          {
            eventId: event._id,
            userId: user._id,
            type,
          },
          {
            remindAt,
            sent: false,
          },
          { upsert: true, new: false, setDefaultsOnInsert: true }
        );

        if (existing) {
          updatedCount += 1;
        } else {
          createdCount += 1;
        }
      }
    }
  }

  console.log(
    `✅ Готово. Создано напоминаний: ${createdCount}, обновлено: ${updatedCount}, пропущено из-за прошедшего времени: ${skippedPastRemindAt}.`
  );

  await mongoose.connection.close();
}

backfillEventReminders().catch((error) => {
  console.error("❌ Ошибка при заполнении напоминаний:", error);
  mongoose.connection.close().finally(() => {
    process.exit(1);
  });
});

