import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import User from "../src/models/User.js";
import Chat from "../src/models/Chat.js";
import Message from "../src/models/Message.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем .env из корня backend
dotenv.config({ path: join(__dirname, "..", ".env") });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/realtime-messenger";

async function viewDatabase() {
  try {
    console.log("🔌 Подключение к MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Подключено к MongoDB\n");

    // Пользователи
    const users = await User.find().select("-passwordHash");
    console.log(`👥 Пользователи (${users.length}):`);
    if (users.length === 0) {
      console.log("  (нет пользователей)");
    } else {
      users.forEach((user) => {
        console.log(`  - ${user.name} (${user.email})`);
        console.log(`    ID: ${user._id}`);
        console.log(`    Создан: ${user.createdAt}`);
        console.log("");
      });
    }

    // Чаты
    const chats = await Chat.find().populate("members", "name email");
    console.log(`💬 Чаты (${chats.length}):`);
    if (chats.length === 0) {
      console.log("  (нет чатов)");
    } else {
      chats.forEach((chat) => {
        console.log(`  - ${chat.title}`);
        console.log(`    ID: ${chat._id}`);
        console.log(
          `    Участники: ${chat.members.map((m) => m.name).join(", ")}`
        );
        console.log(`    Создан: ${chat.createdAt}`);
        console.log("");
      });
    }

    // Сообщения
    const totalMessages = await Message.countDocuments();
    const messages = await Message.find()
      .populate("authorId", "name")
      .populate("chatId", "title")
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`📨 Сообщения (показано ${messages.length} из ${totalMessages}):`);
    if (messages.length === 0) {
      console.log("  (нет сообщений)");
    } else {
      messages.forEach((msg) => {
        const chatTitle = msg.chatId?.title || "Неизвестный чат";
        const authorName = msg.authorId?.name || "Неизвестный";
        console.log(`  - [${chatTitle}] ${authorName}: ${msg.text.substring(0, 60)}${msg.text.length > 60 ? "..." : ""}`);
        console.log(`    ID: ${msg._id}`);
        console.log(`    Время: ${msg.createdAt}`);
        console.log("");
      });
    }

    // Статистика
    console.log("📊 Статистика:");
    console.log(`  Пользователей: ${users.length}`);
    console.log(`  Чатов: ${chats.length}`);
    console.log(`  Сообщений: ${totalMessages}`);

    await mongoose.connection.close();
    console.log("\n✅ Готово!");
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    if (error.message.includes("ECONNREFUSED")) {
      console.error("\n💡 Убедитесь, что MongoDB запущен!");
      console.error("   Docker: docker start mongodb");
      console.error("   Homebrew: brew services start mongodb-community");
    }
    process.exit(1);
  }
}

viewDatabase();
