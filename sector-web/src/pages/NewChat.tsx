import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchUsers } from "../api/users";
import { getOrCreatePrivateChat } from "../api/chats";
import type { User } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import styles from "./NewChat.module.css";

export function NewChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const doSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const list = await searchUsers(q);
      setUsers(list.filter((u) => u.id !== user?.id));
    } catch {
      setUsers([]);
    } finally {
      setSearching(false);
    }
  };

  const startPrivate = async (other: User) => {
    setCreating(other.id);
    try {
      const chat = await getOrCreatePrivateChat(other.id);
      navigate(`/chat/${chat.id}`, { replace: true });
    } catch {
      setCreating(null);
    }
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <button type="button" onClick={() => navigate(-1)} className={styles.back}>
          ← Назад
        </button>
        <h1 className={styles.title}>Новый чат</h1>
      </header>
      <div className={styles.search}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          placeholder="Поиск по email или имени…"
          className={styles.input}
        />
        <button type="button" onClick={doSearch} className={styles.button} disabled={searching}>
          {searching ? "Поиск…" : "Искать"}
        </button>
      </div>
      <ul className={styles.userList}>
        {users.map((u) => (
          <li key={u.id} className={styles.userItem}>
            <span className={styles.userName}>{u.name}</span>
            <span className={styles.userEmail}>{u.email}</span>
            <button
              type="button"
              onClick={() => startPrivate(u)}
              className={styles.startBtn}
              disabled={creating === u.id}
            >
              {creating === u.id ? "…" : "Написать"}
            </button>
          </li>
        ))}
      </ul>
      {users.length === 0 && query.trim() && !searching && (
        <p className={styles.hint}>Введите запрос и нажмите «Искать»</p>
      )}
    </div>
  );
}
