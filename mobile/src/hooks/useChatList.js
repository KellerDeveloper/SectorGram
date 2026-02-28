import { useEffect, useState, useCallback } from "react";
import { setAuthToken, api } from "../api/client";
import { connectSocket } from "../api/socket";

/**
 * Общий хук для работы со списком чатов.
 * Отвечает за:
 * - загрузку чатов с сервера;
 * - подписку на socket-событие `chat_updated`;
 * - сортировку по времени последнего сообщения;
 * - поиск по имени чата/собеседника.
 *
 * ВНИМАНИЕ: не меняем существующий API бекенда и Socket.IO-событий.
 */
export function useChatList(token) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Загрузка списка чатов
  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/chats");
      // Сортируем по последнему сообщению
      const sorted = res.data.sort((a, b) => {
        const aTime = new Date(a.lastMessageAt || a.createdAt);
        const bTime = new Date(b.lastMessageAt || b.createdAt);
        return bTime - aTime;
      });
      setChats(sorted);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Инициализация токена и сокета + подписка на обновления чатов
  useEffect(() => {
    if (!token) {
      return;
    }

    setAuthToken(token);
    const socket = connectSocket(token);

    // Используем более "бережную" логику из ChatListScreen:
    // обновляем существующий чат и сохраняем otherUser, если он не пришёл.
    const handleChatUpdated = (chat) => {
      setChats((prev) => {
        const index = prev.findIndex((c) => c.id === chat.id);
        if (index >= 0) {
          const updated = [...prev];
          const existing = updated[index];
          updated[index] = {
            ...existing,
            ...chat,
            otherUser: chat.otherUser ?? existing.otherUser,
          };
          return updated.sort((a, b) => {
            const aTime = new Date(a.lastMessageAt || a.createdAt);
            const bTime = new Date(b.lastMessageAt || b.createdAt);
            return bTime - aTime;
          });
        }
        return [chat, ...prev];
      });
    };

    socket.on("chat_updated", handleChatUpdated);

    loadChats();

    return () => {
      socket.off("chat_updated", handleChatUpdated);
    };
  }, [token, loadChats]);

  // Фильтрация по строке поиска
  const filteredChats = chats.filter((chat) => {
    const name =
      chat.type === "private"
        ? chat.otherUser?.name || chat.title || ""
        : chat.title || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return {
    chats,
    filteredChats,
    loading,
    searchQuery,
    setSearchQuery,
    refresh: loadChats,
  };
}

