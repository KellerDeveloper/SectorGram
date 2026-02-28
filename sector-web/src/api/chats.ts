import { api } from "./client";

export type ChatMember = { id: string; name: string; email?: string; isOnline?: boolean };
export type Chat = {
  id: string;
  title?: string;
  isPrivate?: boolean;
  members?: ChatMember[];
  lastMessage?: { text: string; createdAt: string; authorId?: string };
  unreadCount?: number;
  updatedAt?: string;
};

export type Message = {
  id: string;
  chatId: string;
  authorId: string;
  text: string;
  createdAt: string;
  editedAt?: string;
  author?: ChatMember;
  replyTo?: { id: string; text: string };
  reactions?: { emoji: string; count: number; userIds?: string[] }[];
  readBy?: { userId: string; readAt: string }[];
};

export async function getChats(): Promise<Chat[]> {
  return api.get<Chat[]>("/chats");
}

export async function createGroupChat(title: string, memberIds: string[]): Promise<Chat> {
  return api.post<Chat>("/chats", { title, memberIds });
}

export async function getOrCreatePrivateChat(otherUserId: string): Promise<Chat> {
  return api.post<Chat>("/chats/private", { userId: otherUserId });
}

export async function getMessages(chatId: string): Promise<Message[]> {
  return api.get<Message[]>(`/chats/${chatId}/messages`);
}

export async function editMessage(messageId: string, text: string): Promise<{ id: string; text: string; editedAt: string }> {
  return api.put(`/chats/messages/${messageId}`, { text });
}

export async function deleteMessage(messageId: string): Promise<void> {
  await api.delete(`/messages/${messageId}`);
}

export async function markChatRead(chatId: string): Promise<void> {
  await api.post(`/chats/${chatId}/read`);
}
