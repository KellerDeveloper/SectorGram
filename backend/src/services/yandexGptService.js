/**
 * Сервис вызова YandexGPT (Text Generation API).
 * Единая точка: получение IAM-токена (при OAuth), запрос completion, обработка ошибок.
 */

import { yandexGptConfig } from "../config/yandexGpt.js";

/** Кэш IAM-токена (живёт 1 час, обновляем заранее) */
let cachedIamToken = null;
let cachedIamExpiresAt = 0;
const IAM_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // обновить за 5 минут до истечения

/**
 * Получить IAM-токен: из кэша, из env (YANDEX_IAM_TOKEN) или обменом OAuth → IAM.
 * @returns {Promise<string|null>}
 */
async function getIamToken() {
  if (yandexGptConfig.iamToken) {
    return yandexGptConfig.iamToken;
  }

  const now = Date.now();
  if (cachedIamToken && cachedIamExpiresAt > now + IAM_EXPIRY_BUFFER_MS) {
    return cachedIamToken;
  }

  if (!yandexGptConfig.oauthToken) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    yandexGptConfig.requestTimeoutMs
  );

  try {
    const res = await fetch(yandexGptConfig.iamTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        yandexPassportOauthToken: yandexGptConfig.oauthToken,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      console.error("[YandexGPT] IAM token error:", res.status, text);
      return null;
    }

    const data = await res.json();
    cachedIamToken = data.iamToken || null;
    cachedIamExpiresAt = data.expiresAt
      ? new Date(data.expiresAt).getTime()
      : now + 60 * 60 * 1000;
    return cachedIamToken;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.error("[YandexGPT] IAM token request timeout");
    } else {
      console.error("[YandexGPT] IAM token request failed:", err.message);
    }
    return null;
  }
}

/**
 * Проверить, доступен ли сервис (конфиг и при необходимости токен).
 * @returns {Promise<{ available: boolean, reason?: string }>}
 */
export async function checkAvailability() {
  if (!yandexGptConfig.enabled) {
    return {
      available: false,
      reason: !yandexGptConfig.folderId
        ? "YANDEX_FOLDER_ID не задан"
        : !yandexGptConfig.oauthToken && !yandexGptConfig.iamToken
          ? "Не задан YANDEX_OAUTH_TOKEN или YANDEX_IAM_TOKEN"
          : "YandexGPT отключён (YANDEX_GPT_ENABLED=false)",
    };
  }

  const token = await getIamToken();
  if (!token) {
    return { available: false, reason: "Не удалось получить IAM-токен" };
  }

  return { available: true };
}

/**
 * Сгенерировать ответ по промпту (один запрос к модели).
 * @param {string} prompt - текст запроса пользователя
 * @param {Object} options
 * @param {string} [options.systemPrompt] - системный промпт (роль ассистента)
 * @param {number} [options.maxTokens] - макс. токенов в ответе
 * @param {number} [options.temperature] - температура генерации (0–1)
 * @returns {Promise<{ text: string } | { error: string }>}
 */
export async function complete(prompt, options = {}) {
  const start = Date.now();

  if (!yandexGptConfig.enabled) {
    return { error: "Сервис YandexGPT недоступен. Проверьте настройки окружения." };
  }

  const modelUri = yandexGptConfig.getModelUri();
  if (!modelUri) {
    return { error: "Не задан YANDEX_FOLDER_ID." };
  }

  const token = await getIamToken();
  if (!token) {
    return { error: "Не удалось авторизоваться в YandexGPT. Проверьте токены." };
  }

  const maxPromptLength = yandexGptConfig.maxPromptLength ?? 8000;
  const truncatedPrompt =
    typeof prompt === "string" && prompt.length > maxPromptLength
      ? prompt.slice(0, maxPromptLength) + "..."
      : prompt || "";

  const messages = [];
  if (options.systemPrompt && options.systemPrompt.trim()) {
    messages.push({
      role: "system",
      text: options.systemPrompt.trim().slice(0, 4000),
    });
  }
  messages.push({ role: "user", text: truncatedPrompt });

  const body = {
    modelUri,
    completionOptions: {
      stream: false,
      temperature:
        typeof options.temperature === "number" &&
        options.temperature >= 0 &&
        options.temperature <= 1
          ? options.temperature
          : 0.6,
      maxTokens: String(
        options.maxTokens ?? yandexGptConfig.defaultMaxTokens ?? 500
      ),
    },
    messages,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    yandexGptConfig.requestTimeoutMs
  );

  try {
    const res = await fetch(yandexGptConfig.completionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const elapsed = Date.now() - start;

    if (!res.ok) {
      const text = await res.text();
      console.error(
        "[YandexGPT] completion error:",
        res.status,
        elapsed,
        "ms",
        text.slice(0, 300)
      );
      if (res.status === 429) {
        return { error: "Превышен лимит запросов. Попробуйте позже." };
      }
      if (res.status === 403) {
        return { error: "Доступ к YandexGPT запрещён. Проверьте права каталога." };
      }
      return {
        error: `Ошибка YandexGPT (${res.status}). Попробуйте позже.`,
      };
    }

    const data = await res.json();
    const text =
      data?.result?.alternatives?.[0]?.message?.text ??
      data?.alternatives?.[0]?.message?.text ??
      "";

    if (elapsed > 5000) {
      console.warn("[YandexGPT] slow request:", elapsed, "ms");
    }

    return { text: text.trim() };
  } catch (err) {
    clearTimeout(timeoutId);
    const elapsed = Date.now() - start;
    if (err.name === "AbortError") {
      console.error("[YandexGPT] completion timeout:", elapsed, "ms");
      return { error: "Превышено время ожидания ответа. Попробуйте позже." };
    }
    console.error("[YandexGPT] completion failed:", err.message);
    return { error: "Временная ошибка сервиса. Попробуйте позже." };
  }
}
