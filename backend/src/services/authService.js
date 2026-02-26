import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const { JWT_SECRET } = process.env;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Please configure it in your environment (.env or hosting settings).");
}

export function generateToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function registerUser({ email, password, name }) {
  if (!email || !password || !name) {
    const error = new Error("email, password, name обязательны");
    error.status = 400;
    throw error;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    const error = new Error("Пользователь с таким email уже существует");
    error.status = 409;
    throw error;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = new User({ email, name, passwordHash });
  await user.save();

  const token = generateToken(user);

  return {
    token,
    user: { id: user._id.toString(), email: user.email, name: user.name },
  };
}

export async function loginUser({ email, password }) {
  if (!email || !password) {
    const error = new Error("email и password обязательны");
    error.status = 400;
    throw error;
  }

  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error("Неверный email или пароль");
    error.status = 401;
    throw error;
  }

  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) {
    const error = new Error("Неверный email или пароль");
    error.status = 401;
    throw error;
  }

  const token = generateToken(user);

  return {
    token,
    user: { id: user._id.toString(), email: user.email, name: user.name },
  };
}

