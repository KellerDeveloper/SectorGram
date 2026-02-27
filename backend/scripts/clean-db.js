import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем .env из корня backend
dotenv.config({ path: join(__dirname, "..", ".env") });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/realtime-messenger";

async function cleanDatabase() {
  try {
    console.log("🔌 Подключение к MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Подключено к MongoDB");

    const dbName = mongoose.connection.db.databaseName;
    console.log(`⚠️ Будет полностью очищена база: ${dbName}`);

    await mongoose.connection.db.dropDatabase();

    console.log("🧹 База данных успешно очищена (dropDatabase).");
    await mongoose.connection.close();
    console.log("✅ Соединение с MongoDB закрыто.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка при очистке базы данных:", error.message);
    if (error.message.includes("ECONNREFUSED")) {
      console.error("\n💡 Убедитесь, что MongoDB запущен и доступен.");
    }
    process.exit(1);
  }
}

cleanDatabase();

