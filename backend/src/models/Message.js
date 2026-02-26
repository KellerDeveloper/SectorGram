import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      // Текст не обязателен если есть медиа
    },
    media: {
      type: {
        type: String,
        enum: ["photo", "video", "file", "audio", "sticker", "videoNote"],
      },
      url: String,
      thumbnail: String, // для videoNote — превью (первый кадр)
      filename: String,
      size: Number,
      emoji: String, // для стикеров-эмодзи
      duration: Number, // длительность в секундах (для videoNote и audio)
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    forwardedFromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    editedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "read"],
      default: "sent",
    },
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
        },
        userIds: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Индекс для сортировки сообщений по дате
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ authorId: 1 });

export default mongoose.model("Message", messageSchema);
