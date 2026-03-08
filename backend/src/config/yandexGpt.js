/**
 * Конфигурация YandexGPT.
 * Если YANDEX_FOLDER_ID или токен не заданы — фичи с GPT отключены (complete() вернёт ошибку).
 * Поддерживаются: YANDEX_OAUTH_TOKEN, YANDEX_IAM_TOKEN, ключ сервисного аккаунта (файл или JSON в env).
 */

import fs from "fs";
import path from "path";

const YANDEX_OAUTH_TOKEN = process.env.YANDEX_OAUTH_TOKEN?.trim() || null;
const YANDEX_IAM_TOKEN = process.env.YANDEX_IAM_TOKEN?.trim() || null;
const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID?.trim() || null;
const YANDEX_GPT_ENABLED = process.env.YANDEX_GPT_ENABLED !== "false";
const YANDEX_SERVICE_ACCOUNT_KEY_FILE = process.env.YANDEX_SERVICE_ACCOUNT_KEY_FILE?.trim() || null;
const YANDEX_SERVICE_ACCOUNT_KEY = process.env.YANDEX_SERVICE_ACCOUNT_KEY?.trim() || null;

/** @type {{ serviceAccountId: string, privateKeyPem: string } | null} */
let serviceAccountKeyData = null;

function loadServiceAccountKey() {
  if (serviceAccountKeyData !== null) return serviceAccountKeyData;
  let raw = null;
  if (YANDEX_SERVICE_ACCOUNT_KEY_FILE) {
    try {
      const resolved = path.isAbsolute(YANDEX_SERVICE_ACCOUNT_KEY_FILE)
        ? YANDEX_SERVICE_ACCOUNT_KEY_FILE
        : path.resolve(process.cwd(), YANDEX_SERVICE_ACCOUNT_KEY_FILE);
      raw = fs.readFileSync(resolved, "utf8");
    } catch (err) {
      console.error("[YandexGPT] Не удалось прочитать файл ключа:", err.message);
      return null;
    }
  } else if (YANDEX_SERVICE_ACCOUNT_KEY) {
    raw = YANDEX_SERVICE_ACCOUNT_KEY;
  }
  if (!raw) return null;

  function repairKeyJson(str) {
    if (typeof str !== "string") return str;
    return str
      .replace(
        /"private_key"\s*:\s*"([\s\S]*?)"(?=\s*[,}])/g,
        (_, val) => '"private_key":"' + val.replace(/\r?\n/g, "\\n") + '"'
      )
      .replace(
        /"public_key"\s*:\s*"([\s\S]*?)"(?=\s*[,}])/g,
        (_, val) => '"public_key":"' + val.replace(/\r?\n/g, "\\n") + '"'
      );
  }

  try {
    let key;
    if (typeof raw === "string") {
      try {
        key = JSON.parse(raw);
      } catch (parseErr) {
        if (/Bad control character|Unexpected token/.test(parseErr.message)) {
          key = JSON.parse(repairKeyJson(raw));
        } else {
          throw parseErr;
        }
      }
    } else {
      key = raw;
    }
    const id = key.service_account_id?.trim();
    let pem = key.private_key?.trim() || "";
    if (!id || !pem) {
      console.error("[YandexGPT] В ключе сервисного аккаунта нет service_account_id или private_key");
      return null;
    }
    pem = pem.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const begin = pem.indexOf("-----BEGIN PRIVATE KEY-----");
    if (begin !== -1) pem = pem.slice(begin).trim();
    const end = pem.indexOf("-----END PRIVATE KEY-----");
    if (end !== -1) pem = pem.slice(0, end + "-----END PRIVATE KEY-----".length);
    const lines = pem.split("\n").filter((line) => {
      const t = line.trim();
      return (
        t === "-----BEGIN PRIVATE KEY-----" ||
        t === "-----END PRIVATE KEY-----" ||
        /^[A-Za-z0-9+/]+=*$/.test(t)
      );
    });
    pem = lines.join("\n");
    if (!pem.includes("-----BEGIN PRIVATE KEY-----") || !pem.includes("-----END PRIVATE KEY-----")) {
      console.error("[YandexGPT] В ключе нет валидного PEM (BEGIN/END PRIVATE KEY)");
      return null;
    }
    serviceAccountKeyData = { serviceAccountId: id, privateKeyPem: pem };
    return serviceAccountKeyData;
  } catch (err) {
    console.error("[YandexGPT] Ошибка разбора ключа сервисного аккаунта:", err.message);
    return null;
  }
}

const IAM_TOKEN_URL = "https://iam.api.cloud.yandex.net/iam/v1/tokens";
const COMPLETION_URL =
  "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";

/** Модель по умолчанию: yandexgpt-lite (быстрее и дешевле), можно заменить на yandexgpt */
const DEFAULT_MODEL = "yandexgpt-lite/latest";

/** Максимальная длина промпта в символах (ориентир для обрезки) */
const MAX_PROMPT_LENGTH = 8000;

/** Максимальная длина ответа в токенах */
const DEFAULT_MAX_TOKENS = 500;

/** Таймаут запроса к API (мс) */
const REQUEST_TIMEOUT_MS = 30000;

function getModelUri() {
  if (!YANDEX_FOLDER_ID) return null;
  return `gpt://${YANDEX_FOLDER_ID}/${DEFAULT_MODEL}`;
}

const hasServiceAccountKey = !!(
  YANDEX_SERVICE_ACCOUNT_KEY_FILE || YANDEX_SERVICE_ACCOUNT_KEY
);

export const yandexGptConfig = {
  /** OAuth-токен Яндекса (для обмена на IAM) */
  oauthToken: YANDEX_OAUTH_TOKEN,
  /** IAM-токен (если задан напрямую, обмен по OAuth не выполняется) */
  iamToken: YANDEX_IAM_TOKEN,
  /** Загрузка ключа сервисного аккаунта (лениво) */
  getServiceAccountKey: loadServiceAccountKey,
  /** Есть ли в env указание на ключ (файл или JSON) */
  hasServiceAccountKey,
  /** ID каталога в Яндекс.Облаке */
  folderId: YANDEX_FOLDER_ID,
  /** Фича включена только если явно не выключена и есть хотя бы один способ аутентификации */
  enabled:
    YANDEX_GPT_ENABLED &&
    (!!YANDEX_OAUTH_TOKEN ||
      !!YANDEX_IAM_TOKEN ||
      hasServiceAccountKey) &&
    !!YANDEX_FOLDER_ID,
  iamTokenUrl: IAM_TOKEN_URL,
  completionUrl: COMPLETION_URL,
  defaultModel: DEFAULT_MODEL,
  getModelUri,
  maxPromptLength: MAX_PROMPT_LENGTH,
  defaultMaxTokens: DEFAULT_MAX_TOKENS,
  requestTimeoutMs: REQUEST_TIMEOUT_MS,
};
