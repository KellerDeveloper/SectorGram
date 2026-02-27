import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import User from "../src/models/User.js";
import Chat from "../src/models/Chat.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем .env из корня backend
dotenv.config({ path: join(__dirname, "..", ".env") });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/realtime-messenger";

async function seedTestChatsForKellermobile() {
  try {
    console.log("🔌 Подключение к MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Подключено к MongoDB\n");

    // Ищем пользователя kellermobile по email или username
    const targetUser = await User.findOne({
      $or: [
        { email: /kellermobile/i },
        { username: /kellermobile/i },
      ],
    });

    if (!targetUser) {
      console.error(
        "❌ Пользователь 'kellermobile' не найден (ни по email, ни по username)."
      );
      console.error(
        "   Проверьте, что такой пользователь существует в коллекции Users."
      );
      process.exit(1);
    }

    console.log(
      `👤 Найден пользователь: ${targetUser.name} (${targetUser.email})`
    );

    // Проверяем, сколько тестовых чатов уже есть
    const existingTestChats = await Chat.find({
      title: /Kellermobile Test Chat #/i,
      members: targetUser._id,
    });

    const EXISTING_COUNT = existingTestChats.length;
    const DESIRED_COUNT = 10;

    if (EXISTING_COUNT >= DESIRED_COUNT) {
      console.log(
        `ℹ️ Уже существует ${EXISTING_COUNT} тестовых чатов для kellermobile. Новые не создаются.`
      );
      await mongoose.connection.close();
      console.log("✅ Соединение с MongoDB закрыто.");
      process.exit(0);
    }

    const remaining = DESIRED_COUNT - EXISTING_COUNT;
    console.log(
      `💬 Будет создано ${remaining} тестовых чатов для kellermobile (всего должно быть ${DESIRED_COUNT}).`
    );

    // Подтягиваем остальных пользователей, чтобы добавить их в участники
    const otherUsers = await User.find({
      _id: { $ne: targetUser._id },
    }).select("_id name email");

    function pickRandomMembers() {
      if (otherUsers.length === 0) {
        return [targetUser._id];
      }

      const members = [targetUser._id];
      const shuffled = [...otherUsers].sort(() => Math.random() - 0.5);
      const extraCount = Math.min(2, shuffled.length); // до двух дополнительных участников

      for (let i = 0; i < extraCount; i++) {
        members.push(shuffled[i]._id);
      }

      return members;
    }

    const now = Date.now();
    const chatsToInsert = [];

    for (let i = EXISTING_COUNT + 1; i <= DESIRED_COUNT; i++) {
      const title = `Kellermobile Test Chat #${i}`;
      const createdAt = new Date(now - (DESIRED_COUNT - i) * 60 * 1000);

      chatsToInsert.push({
        type: "group",
        title,
        members: pickRandomMembers(),
        lastMessageAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      });
    }

    const created = await Chat.insertMany(chatsToInsert);

    console.log(`✅ Создано чатов: ${created.length}`);
    created.forEach((chat) => {
      console.log(
        `  - ${chat.title} (ID: ${chat._id}, участников: ${chat.members.length})`
      );
    });

    await mongoose.connection.close();
    console.log("✅ Соединение с MongoDB закрыто.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка при создании тестовых чатов:", error.message);
    if (error.message.includes("ECONNREFUSED")) {
      console.error("\n💡 Убедитесь, что MongoDB запущен и доступен.");
    }
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedTestChatsForKellermobile();

