import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["private", "group"],
      default: "group",
    },
    title: {
      type: String,
      trim: true,
      // Для личных чатов title не обязателен
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageAt: {
      type: Date,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Индекс для быстрого поиска чатов пользователя
chatSchema.index({ members: 1 });
chatSchema.index({ lastMessageAt: -1 });

// Виртуальное поле для названия чата (для личных чатов берем имя собеседника)
chatSchema.virtual("displayTitle").get(function () {
  if (this.type === "group" && this.title) {
    return this.title;
  }
  return this.title || "Chat";
});

export default mongoose.model("Chat", chatSchema);
