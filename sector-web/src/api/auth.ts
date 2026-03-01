import { api, setToken, clearToken } from "./client";

export type User = {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  avatar?: string | null;
  bio?: string | null;
};
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

/** Вход через Google: передать id_token из Google Sign-In */
export async function loginWithGoogle(idToken: string): Promise<AuthResult> {
  const result = await api.post<AuthResult>("/auth/google", { idToken });
  setToken(result.token);
  return result;
}

export function logout() {
  clearToken();
}
