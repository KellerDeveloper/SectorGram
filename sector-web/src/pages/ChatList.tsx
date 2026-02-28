import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getChats } from "../api/chats";
import type { Chat } from "../api/chats";
import { useAuth } from "../context/AuthContext";
import styles from "./ChatList.module.css";

export function ChatList() {
  const { user, logout } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getChats()
      .then((list) => {
        if (!cancelled) setChats(list);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function chatTitle(chat: Chat & { type?: string; otherUser?: { name: string } }): string {
    if (chat.type === "private" && chat.otherUser) return chat.otherUser.name;
    return chat.title ?? "Чат";
  }

  function lastPreview(chat: Chat & { lastMessage?: { text: string } }): string {
    const last = chat.lastMessage;
    if (!last || typeof last !== "object" || !("text" in last)) return "";
    return last.text ?? "";
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Sector</h1>
        <div className={styles.user}>
          <span className={styles.userName}>{user?.name}</span>
          <button type="button" onClick={logout} className={styles.logout}>
            Выйти
          </button>
        </div>
      </header>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Чаты</h2>
          <Link to="/new-chat" className={styles.newChat}>Новый чат</Link>
        </div>
        {error && <div className={styles.error}>{error}</div>}
        {loading ? (
          <div className={styles.loading}>Загрузка…</div>
        ) : (
          <ul className={styles.chatList}>
            {chats.map((chat) => (
              <li key={chat.id}>
                <Link to={`/chat/${chat.id}`} className={styles.chatItem}>
                  <div className={styles.chatAvatar}>
                    {chatTitle(chat).slice(0, 1).toUpperCase()}
                  </div>
                  <div className={styles.chatInfo}>
                    <span className={styles.chatName}>{chatTitle(chat)}</span>
                    <span className={styles.chatPreview}>{lastPreview(chat) || "Нет сообщений"}</span>
                  </div>
                  {((chat as Chat & { unreadCount?: number }).unreadCount ?? 0) > 0 && (
                    <span className={styles.unread}>
                      {(chat as Chat & { unreadCount?: number }).unreadCount ?? 0}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <main className={styles.main}>
        <div className={styles.placeholder}>
          <p>Выберите чат слева или создайте новый.</p>
        </div>
      </main>
    </div>
  );
}
