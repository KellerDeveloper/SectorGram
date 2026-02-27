import multer from "multer";
import path from "path";
import fs from "fs";

// Директория для хранения видеокружков
const videoNotesDir = path.join(process.cwd(), "uploads", "video-notes");

if (!fs.existsSync(videoNotesDir)) {
  fs.mkdirSync(videoNotesDir, { recursive: true });
}

// Хранилище: кладём файлы в uploads/video-notes с уникальным именем
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoNotesDir);
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname || "video-note";
    const ext = path.extname(originalName) || ".mp4";
    const base = path.basename(originalName, ext);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${unique}${ext}`);
  },
});

export const videoNoteUpload = multer({
  storage,
  limits: {
    // Лимит размера файла — подбери под себя.
    // Важно синхронизировать его с nginx/proxy, чтобы не ловить 413.
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("video/")) {
      return cb(new Error("Разрешены только видеофайлы"));
    }
    cb(null, true);
  },
});

