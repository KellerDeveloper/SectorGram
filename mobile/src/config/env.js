// Конфигурация API и WebSocket для мобильного приложения.
// Expo автоматически прокидывает переменные EXPO_PUBLIC_*.
import { Platform } from "react-native";

function trimTrailingSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}

function resolveWebApiBaseUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const { hostname } = window.location;

  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000";
  }

  const baseHost = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  return `https://api.${baseHost}`;
}

function resolveApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return trimTrailingSlash(process.env.EXPO_PUBLIC_API_BASE_URL);
  }

  if (Platform.OS === "web") {
    const inferredWebUrl = resolveWebApiBaseUrl();
    if (inferredWebUrl) {
      return inferredWebUrl;
    }
  }

  return "http://localhost:4000";
}

function resolveWsBaseUrl(apiBaseUrl) {
  if (process.env.EXPO_PUBLIC_WS_BASE_URL) {
    return trimTrailingSlash(process.env.EXPO_PUBLIC_WS_BASE_URL);
  }

  return apiBaseUrl;
}

const API_BASE_URL = resolveApiBaseUrl();
const WS_BASE_URL = resolveWsBaseUrl(API_BASE_URL);

export { API_BASE_URL, WS_BASE_URL };

