import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Message from "../src/models/Message.js";
import Chat from "../src/models/Chat.js";
import Event from "../src/models/Event.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/realtime-messenger";

async function cleanChatsAndEvents() {
  try {
    console.log("🔌 Подключение к MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Подключено к MongoDB\n");

    const deletedMessages = await Message.deleteMany({});
    console.log(`📨 Удалено сообщений: ${deletedMessages.deletedCount}`);

    const deletedEvents = await Event.deleteMany({});
    console.log(`📅 Удалено событий: ${deletedEvents.deletedCount}`);

    const deletedChats = await Chat.deleteMany({});
    console.log(`💬 Удалено чатов: ${deletedChats.deletedCount}`);

    console.log("\n🧹 Чаты и события очищены. Пользователи сохранены.");
    await mongoose.connection.close();
    console.log("✅ Готово!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    if (error.message.includes("ECONNREFUSED")) {
      console.error("\n💡 Убедитесь, что MongoDB запущен.");
    }
    process.exit(1);
  }
}

cleanChatsAndEvents();
