import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { videoNoteUpload } from "../config/upload.js";
import path from "path";

const router = express.Router();

router.use(authMiddleware);

// POST /media/upload/video-note
// multipart/form-data:
// - file: бинарное видео (обязательно)
// - duration: число секунд (опционально)
// - size: число байт (опционально)
router.post(
  "/upload/video-note",
  videoNoteUpload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Файл не передан" });
      }

      const { duration, size } = req.body || {};
      const file = req.file;

      // Базовый URL сервера: либо из env, либо текущий хост
      const baseUrl =
        process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;

      // Путь, по которому файл будет доступен через express.static
      const relativePath = `/uploads/video-notes/${file.filename}`;
      const fileUrl = `${baseUrl}${relativePath}`;

      const result = {
        url: fileUrl,
        thumbnailUrl: null, // превью можно добавить позже (фоновый воркер/FFmpeg)
        duration: duration ? Number(duration) : null,
        size: size ? Number(size) : file.size,
      };

      return res.status(201).json(result);
    } catch (error) {
      // Multer при превышении лимита fileSize кидает ошибку с кодом LIMIT_FILE_SIZE
      if (error && error.code === "LIMIT_FILE_SIZE") {
        return res
          .status(413)
          .json({ error: "Файл слишком большой для загрузки" });
      }
      return next(error);
    }
  }
);

export default router;

