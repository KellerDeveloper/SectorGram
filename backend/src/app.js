import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import storyRoutes from "./routes/storyRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { getHttpCorsOptions } from "./config/cors.js";

dotenv.config();

export function createApp() {
  const app = express();
  app.use(cors(getHttpCorsOptions()));

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // HTTP-роуты
  app.use("/auth", authRoutes);
  app.use("/chats", chatRoutes);
  app.use("/users", userRoutes);
  app.use("/notifications", notificationRoutes);
  app.use("/stories", storyRoutes);

  // Централизованный обработчик ошибок — в самом конце цепочки middleware
  app.use(errorHandler);

  return app;
}


