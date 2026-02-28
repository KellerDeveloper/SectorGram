// API клиент на fetch (работает в React Native без проблем)
import { API_BASE_URL } from "../config/env";

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    // Проверяем Content-Type перед парсингом JSON
    const contentType = response.headers.get("content-type");
    let data;
    
    if (contentType && contentType.includes("application/json")) {
      try {
        const text = await response.text();
        // Проверяем, что ответ не пустой
        if (!text || text.trim().length === 0) {
          throw new Error("Пустой ответ от сервера");
        }
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        throw new Error("Ошибка парсинга ответа сервера. Проверьте, что сервер запущен и доступен.");
      }
    } else {
      // Если не JSON, читаем как текст
      const text = await response.text();
      console.error("Non-JSON response:", text.substring(0, 200));
      throw new Error(`Сервер вернул неверный формат (${contentType || "unknown"}). Статус: ${response.status}`);
    }

    if (!response.ok) {
      const errorMessage = data?.error || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    return { data };
  } catch (error) {
    console.error("API Error:", error);
    // Если это ошибка парсинга JSON или сетевые ошибки
    if (error.message.includes("JSON") || 
        error.message.includes("Unexpected") || 
        error.message.includes("Failed to fetch") ||
        error.message.includes("Network request failed")) {
      throw new Error("Ошибка связи с сервером. Проверьте:\n1. Сервер запущен\n2. Правильный адрес сервера\n3. Сетевое подключение");
    }
    throw error;
  }
}

export const api = {
  get: (endpoint) => request(endpoint, { method: "GET" }),
  post: (endpoint, body) =>
    request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  put: (endpoint, body) =>
    request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (endpoint) => request(endpoint, { method: "DELETE" }),
};

