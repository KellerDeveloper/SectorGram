// Конфигурация API и WebSocket для мобильного приложения.
// Expo автоматически прокидывает переменные EXPO_PUBLIC_*.

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:4000";

const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_BASE_URL || API_BASE_URL;

export { API_BASE_URL, WS_BASE_URL };

