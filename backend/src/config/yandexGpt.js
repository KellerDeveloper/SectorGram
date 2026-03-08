/**
 * Конфигурация YandexGPT.
 * Если YANDEX_FOLDER_ID или токен не заданы — фичи с GPT отключены (complete() вернёт ошибку).
 */

const YANDEX_OAUTH_TOKEN = process.env.YANDEX_OAUTH_TOKEN?.trim() || null;
const YANDEX_IAM_TOKEN = process.env.YANDEX_IAM_TOKEN?.trim() || null;
const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID?.trim() || null;
const YANDEX_GPT_ENABLED = process.env.YANDEX_GPT_ENABLED !== "false";

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

export const yandexGptConfig = {
  /** OAuth-токен Яндекса (для обмена на IAM) */
  oauthToken: YANDEX_OAUTH_TOKEN,
  /** IAM-токен (если задан напрямую, обмен по OAuth не выполняется) */
  iamToken: YANDEX_IAM_TOKEN,
  /** ID каталога в Яндекс.Облаке */
  folderId: YANDEX_FOLDER_ID,
  /** Фича включена только если явно не выключена и есть хотя бы один способ аутентификации */
  enabled:
    YANDEX_GPT_ENABLED &&
    (!!YANDEX_OAUTH_TOKEN || !!YANDEX_IAM_TOKEN) &&
    !!YANDEX_FOLDER_ID,
  iamTokenUrl: IAM_TOKEN_URL,
  completionUrl: COMPLETION_URL,
  defaultModel: DEFAULT_MODEL,
  getModelUri,
  maxPromptLength: MAX_PROMPT_LENGTH,
  defaultMaxTokens: DEFAULT_MAX_TOKENS,
  requestTimeoutMs: REQUEST_TIMEOUT_MS,
};
