import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["photo", "text"],
      required: true,
    },
    media: {
      url: String,
      thumbnail: String,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    viewedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Истории за последние 24 часа
storySchema.index({ userId: 1, createdAt: -1 });
storySchema.index({ createdAt: -1 });

export default mongoose.model("Story", storySchema);
