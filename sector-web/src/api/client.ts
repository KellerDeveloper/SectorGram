// Локальная разработка: /api (прокси на backend). Продакшен: VITE_API_URL (например https://api.sector.moscow)
const API_BASE =
  import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== ""
    ? import.meta.env.VITE_API_URL
    : "/api";

export function getToken(): string | null {
  return localStorage.getItem("sector_token");
}

export function setToken(token: string) {
  localStorage.setItem("sector_token", token);
}

export function clearToken() {
  localStorage.removeItem("sector_token");
}

export type ApiError = { error?: string; message?: string };

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as ApiError).error ?? (data as ApiError).message ?? "Ошибка запроса") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
