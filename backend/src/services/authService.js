import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

const { JWT_SECRET, GOOGLE_CLIENT_ID } = process.env;

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

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const error = new Error("Пользователь с таким email уже существует");
    error.status = 409;
    throw error;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = new User({ email: normalizedEmail, name, passwordHash });
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

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const error = new Error("Неверный email или пароль");
    error.status = 401;
    throw error;
  }

  if (!user.passwordHash) {
    const error = new Error("Этот аккаунт привязан к Google. Войдите через Google.");
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

/**
 * Вход/регистрация через Google (по id_token с клиента).
 * @param {string} idToken — ID-токен от Google Sign-In (клиент передаёт в теле запроса).
 */
export async function loginOrRegisterWithGoogle(idToken) {
  if (!GOOGLE_CLIENT_ID) {
    const error = new Error("Google OAuth не настроен (GOOGLE_CLIENT_ID)");
    error.status = 503;
    throw error;
  }

  if (!idToken || typeof idToken !== "string") {
    const error = new Error("idToken обязателен");
    error.status = 400;
    throw error;
  }

  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    const error = new Error("Невалидный или истёкший Google id_token");
    error.status = 401;
    error.cause = err;
    throw error;
  }

  const { sub: googleId, email, name, picture } = payload || {};
  if (!email) {
    const error = new Error("В токене Google отсутствует email");
    error.status = 400;
    throw error;
  }

  let user = await User.findOne({ googleId });
  if (!user) {
    user = await User.findOne({ email: email.toLowerCase() });
  }
  if (!user) {
    user = new User({
      email: email.toLowerCase(),
      name: name || email.split("@")[0],
      avatar: picture || undefined,
      googleId,
      passwordHash: null,
    });
    await user.save();
  } else {
    if (!user.googleId) {
      user.googleId = googleId;
      if (picture) user.avatar = picture;
      await user.save();
    }
  }

  const token = generateToken(user);
  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    },
  };
}

