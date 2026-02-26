import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
    },
    avatar: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: 200,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    expoPushToken: {
      type: String,
      // Храним последний известный Expo Push Token пользователя
    },
  },
  {
    timestamps: true,
  }
);

// Метод для преобразования в JSON без пароля
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

export default mongoose.model("User", userSchema);
