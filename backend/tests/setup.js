// Лёгкая настройка окружения для Jest-тестов backend.
// Мы не создаём отдельную тестовую БД, а рассчитываем,
// что в окружении уже есть корректный MONGODB_URI (как в .env).

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

beforeAll(async () => {
  // JWT_SECRET нужен для authService / authMiddleware
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test-secret";
  }

  if (process.env.MONGODB_URI && mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});



