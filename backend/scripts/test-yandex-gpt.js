/**
 * Проверка работы YandexGPT API.
 *
 * Запуск (backend должен быть запущен, в .env заданы YANDEX_FOLDER_ID и YANDEX_OAUTH_TOKEN):
 *
 *   1. Получить JWT (подставьте свой email и пароль):
 *      curl -s -X POST http://localhost:4000/auth/login \
 *        -H "Content-Type: application/json" \
 *        -d '{"email":"your@email.com","password":"yourpassword"}' | jq -r '.token'
 *
 *   2. Запустить скрипт с токеном:
 *      AUTH_TOKEN=полученный_токен node scripts/test-yandex-gpt.js
 *
 * Или одной строкой (после логина подставьте токен в AUTH_TOKEN):
 *      AUTH_TOKEN=... node scripts/test-yandex-gpt.js
 */

import "dotenv/config";

const BASE_URL = process.env.BACKEND_URL || "http://localhost:4000";
const AUTH_TOKEN = process.env.AUTH_TOKEN;

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(AUTH_TOKEN && { Authorization: `Bearer ${AUTH_TOKEN}` }),
    },
  };
  if (body && (method === "POST" || method === "PUT")) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function main() {
  console.log("Backend URL:", BASE_URL);
  console.log("");

  if (!AUTH_TOKEN) {
    console.log("AUTH_TOKEN не задан. Получите токен:");
    console.log('  curl -s -X POST ' + BASE_URL + '/auth/login -H "Content-Type: application/json" -d \'{"email":"your@email.com","password":"yourpassword"}\'');
    console.log("");
    console.log("Затем: AUTH_TOKEN=полученный_токен node scripts/test-yandex-gpt.js");
    process.exit(1);
  }

  // 1. Health
  console.log("1. GET /ai/health");
  const healthRes = await request("GET", "/ai/health");
  console.log("   Status:", healthRes.status);
  console.log("   Body:", JSON.stringify(healthRes.data, null, 2));
  if (healthRes.status !== 200) {
    console.log("   Ошибка: авторизация или сервер. Проверьте токен и что backend запущен.");
    process.exit(1);
  }
  if (!healthRes.data?.ok) {
    console.log("   YandexGPT недоступен:", healthRes.data?.reason || "неизвестно");
    console.log("   Проверьте YANDEX_FOLDER_ID и YANDEX_OAUTH_TOKEN в .env backend.");
    process.exit(1);
  }
  console.log("   OK — YandexGPT доступен.\n");

  // 2. Suggest description
  console.log("2. POST /ai/suggest-event-description");
  const suggestRes = await request("POST", "/ai/suggest-event-description", {
    title: "Встреча по проекту Sector",
    place: "Коворкинг на Тверской",
  });
  console.log("   Status:", suggestRes.status);
  if (suggestRes.data?.error) {
    console.log("   Error:", suggestRes.data.error);
  } else if (suggestRes.data?.description) {
    console.log("   Description:");
    console.log("   ---");
    console.log("   " + suggestRes.data.description.split("\n").join("\n   "));
    console.log("   ---");
  } else {
    console.log("   Body:", JSON.stringify(suggestRes.data, null, 2));
  }
  console.log("");
  console.log("Готово.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
