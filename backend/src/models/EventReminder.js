import mongoose from "mongoose";

const eventReminderSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["1h", "3h"],
      required: true,
      index: true,
    },
    remindAt: {
      type: Date,
      required: true,
      index: true,
    },
    sent: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

eventReminderSchema.index(
  { eventId: 1, userId: 1, type: 1 },
  { unique: true }
);

export default mongoose.model("EventReminder", eventReminderSchema);

