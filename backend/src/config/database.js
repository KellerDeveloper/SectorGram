import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/realtime-messenger";

export async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Подключено к MongoDB:", MONGODB_URI);
  } catch (error) {
    console.error("❌ Ошибка подключения к MongoDB:", error.message);
    process.exit(1);
  }
}

// Обработка отключения
mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB отключен");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Ошибка MongoDB:", err);
});

async function closeDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log("MongoDB соединение закрыто");
  }
}

process.on("SIGINT", async () => {
  await closeDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDatabase();
  process.exit(0);
});
