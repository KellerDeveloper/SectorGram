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

// Лимит размера файла (в байтах).
// Можно уменьшить/увеличить, но важно синхронизировать с nginx/proxy.
export const VIDEO_NOTE_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export const videoNoteUpload = multer({
  storage,
  limits: {
    fileSize: VIDEO_NOTE_MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("video/")) {
      return cb(new Error("Разрешены только видеофайлы"));
    }
    cb(null, true);
  },
});

