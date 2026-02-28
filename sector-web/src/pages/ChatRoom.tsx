import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getMessages, markChatRead } from "../api/chats";
import type { Message } from "../api/chats";
import { useAuth } from "../context/AuthContext";
import { useSocket, useSocketOn } from "../socket/useSocket";
import styles from "./ChatRoom.module.css";

export function ChatRoom() {
  const { id: chatId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;
    setLoading(true);
    getMessages(chatId)
      .then((list) => {
        if (!cancelled) setMessages(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  useEffect(() => {
    if (!socket || !chatId) return;
    socket.emit("join_chat", chatId);
    markChatRead(chatId).catch(() => {});
    return () => {
      socket.emit("leave_chat", chatId);
    };
  }, [socket, chatId]);

  const handleNewMessage = useCallback((msg: Message & { chatId?: string }) => {
    if (msg.chatId && msg.chatId !== chatId) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, { ...msg, chatId: msg.chatId ?? chatId! }];
    });
  }, [chatId]);

  const handleMessageUpdated = useCallback((data: { id: string; chatId: string; text: string }) => {
    if (data.chatId !== chatId) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === data.id ? { ...m, text: data.text, editedAt: new Date().toISOString() } : m))
    );
  }, [chatId]);

  const handleMessageDeleted = useCallback((data: { id: string; chatId: string }) => {
    if (data.chatId !== chatId) return;
    setMessages((prev) => prev.filter((m) => m.id !== data.id));
  }, [chatId]);

  const handleUserTyping = useCallback((data: { chatId: string; userId: string; userName?: string }) => {
    if (data.chatId !== chatId) return;
    setTypingUser(data.userName ?? data.userId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
  }, [chatId]);

  const handleUserStoppedTyping = useCallback((data: { chatId: string; userId: string }) => {
    if (data.chatId !== chatId) return;
    setTypingUser(null);
  }, [chatId]);

  useSocketOn(socket, "new_message", handleNewMessage);
  useSocketOn(socket, "message_updated", handleMessageUpdated);
  useSocketOn(socket, "message_deleted", handleMessageDeleted);
  useSocketOn(socket, "user_typing", handleUserTyping);
  useSocketOn(socket, "user_stopped_typing", handleUserStoppedTyping);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!socket || !chatId || !text) return;
    socket.emit("send_message", { chatId, text });
    setInput("");
    socket.emit("typing_stop", { chatId });
  };

  const onInputChange = (value: string) => {
    setInput(value);
    if (!socket || !chatId) return;
    socket.emit("typing_start", { chatId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", { chatId });
    }, 2000);
  };

  if (!chatId) return null;

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Чаты</Link>
        <span className={styles.chatTitle}>Чат {chatId.slice(-6)}</span>
      </header>
      <div className={styles.messagesWrap} ref={listRef}>
        {loading ? (
          <div className={styles.loading}>Загрузка сообщений…</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.authorId === user?.id ? styles.messageOut : styles.messageIn}
            >
              {msg.author && msg.authorId !== user?.id && (
                <span className={styles.authorName}>{msg.author.name}</span>
              )}
              <div className={styles.bubble}>{msg.text}</div>
              <span className={styles.time}>
                {new Date(msg.createdAt).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                {msg.editedAt && " (ред.)"}
              </span>
            </div>
          ))
        )}
        {typingUser && (
          <div className={styles.typing}>{typingUser} печатет…</div>
        )}
      </div>
      <form onSubmit={sendMessage} className={styles.form}>
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Сообщение…"
          className={styles.input}
          autoComplete="off"
        />
        <button type="submit" className={styles.send} disabled={!input.trim()}>
          Отправить
        </button>
      </form>
    </div>
  );
}
