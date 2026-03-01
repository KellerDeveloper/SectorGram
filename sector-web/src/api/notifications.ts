import { api } from "./client";

/**
 * Регистрация push-токена для уведомлений.
 * Бэкенд ожидает Expo Push Token; для веба можно передать токен из Expo Web или будущий Web Push endpoint.
 */
export async function registerPushToken(expoPushToken: string): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>("/notifications/register", { expoPushToken });
}
