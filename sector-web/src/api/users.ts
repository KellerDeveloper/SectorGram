import { api } from "./client";
import type { User } from "./auth";

export async function getMe(): Promise<User> {
  return api.get<User>("/users/me");
}

export async function searchUsers(q: string): Promise<User[]> {
  const res = await api.get<{ users?: User[] }>(`/users/search?q=${encodeURIComponent(q)}`);
  return (res as { users: User[] }).users ?? [];
}

export async function getOnlineUsers(): Promise<User[]> {
  const res = await api.get<{ users?: User[] }>("/users/online");
  return (res as { users: User[] }).users ?? [];
}
