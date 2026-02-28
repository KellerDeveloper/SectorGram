import { api, setToken, clearToken } from "./client";

export type User = { id: string; email: string; name: string };
export type AuthResult = { token: string; user: User };

export async function register(email: string, password: string, name: string): Promise<AuthResult> {
  const result = await api.post<AuthResult>("/auth/register", { email, password, name });
  setToken(result.token);
  return result;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const result = await api.post<AuthResult>("/auth/login", { email, password });
  setToken(result.token);
  return result;
}

export function logout() {
  clearToken();
}
