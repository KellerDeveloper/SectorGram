import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getMessages, markChatRead, getChatOnline } from "../api/chats";
import type { Message } from "../api/chats";
import { uploadVideoNote } from "../api/media";
import { useAuth } from "../context/AuthContext";
import { useSocket, useSocketOn } from "../socket/useSocket";
import { VideoNoteRecorder } from "./VideoNoteRecorder";
import styles from "./ChatRoom.module.css";

type OnlineMember = { id: string; name: string; email?: string };

export function ChatRoom() {
  const { id: chatId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
  const [onlineTotal, setOnlineTotal] = useState(0);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [recorderOpen, setRecorderOpen] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({});

  /** Порядок id сообщений-видеокружков для автозапуска следующего */
  const videoNoteIds = React.useMemo(
    () =>
      messages
        .filter((m) => m.media?.type === "videoNote" && m.media?.url)
        .map((m) => m.id),
    [messages]
  );

  const onVideoNoteClick = useCallback((msgId: string) => {
    const video = videoRefs.current[msgId];
    if (!video) return;
    if (playingVideoId === msgId) {
      video.pause();
      setPlayingVideoId(null);
      return;
    }
    video.currentTime = 0;
    video.muted = false;
    video.loop = false;
    video.play().catch(() => {});
    setPlayingVideoId(msgId);
  }, [playingVideoId]);

  const onVideoTimeUpdate = useCallback((msgId: string) => {
    const video = videoRefs.current[msgId];
    if (!video || !video.duration || !isFinite(video.duration)) return;
    setVideoProgress((prev) => ({ ...prev, [msgId]: video.currentTime / video.duration }));
  }, []);

  const onVideoEnded = useCallback(() => {
    if (!playingVideoId) return;
    const idx = videoNoteIds.indexOf(playingVideoId);
    const nextId = idx >= 0 && idx < videoNoteIds.length - 1 ? videoNoteIds[idx + 1] : null;
    setVideoProgress((prev) => ({ ...prev, [playingVideoId]: 1 }));
    setPlayingVideoId(null);
    if (nextId) {
      const nextVideo = videoRefs.current[nextId];
      if (nextVideo) {
        nextVideo.currentTime = 0;
        nextVideo.muted = false;
        nextVideo.loop = false;
        nextVideo.play().catch(() => {});
        setPlayingVideoId(nextId);
      }
    }
  }, [playingVideoId, videoNoteIds]);

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
    if (!chatId) return;
    let cancelled = false;
    getChatOnline(chatId)
      .then((data) => {
        if (!cancelled) {
          setOnlineMembers(data.onlineMembers ?? []);
          setOnlineTotal(data.totalCount ?? 0);
        }
      })
      .catch(() => {
        if (!cancelled) setOnlineMembers([]);
      });
    const interval = setInterval(() => {
      getChatOnline(chatId)
        .then((data) => {
          if (!cancelled) {
            setOnlineMembers(data.onlineMembers ?? []);
            setOnlineTotal(data.totalCount ?? 0);
          }
        })
        .catch(() => {});
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
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
  useSocketOn(socket, "error", (data: { message?: string }) => {
    if (data?.message) setVideoError(data.message);
  });

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

  const onVideoNoteSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !socket || !chatId) return;
      setVideoError("");
      setVideoUploading(true);
      try {
        const res = await uploadVideoNote(file);
        socket.emit("send_message", {
          chatId,
          media: {
            type: "videoNote",
            url: res.url,
            thumbnail: res.thumbnailUrl ?? undefined,
            duration: res.duration ?? undefined,
          },
        });
      } catch (err: unknown) {
        setVideoError(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        setVideoUploading(false);
      }
    },
    [socket, chatId]
  );

  const onRecordedVideoNoteSend = useCallback(
    async (result: { blob: Blob; durationSec: number }) => {
      if (!socket || !chatId) return;
      if (result.blob.size === 0) {
        setVideoError("Запись пустая. Запишите 1–2 секунды и попробуйте снова.");
        return;
      }
      setVideoError("");
      setVideoUploading(true);
      setRecorderOpen(false);
      try {
        const mimeType = result.blob.type && result.blob.type.startsWith("video/") ? result.blob.type : "video/webm";
        const file = new File([result.blob], "video-note.webm", { type: mimeType });
        const res = await uploadVideoNote(file, Math.round(result.durationSec), result.blob.size);
        socket.emit("send_message", {
          chatId,
          media: {
            type: "videoNote",
            url: res.url,
            thumbnail: res.thumbnailUrl ?? undefined,
            duration: res.duration ?? undefined,
          },
        });
      } catch (err: unknown) {
        setVideoError(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        setVideoUploading(false);
      }
    },
    [socket, chatId]
  );

  if (!chatId) return null;

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Чаты</Link>
        <span className={styles.chatTitle}>Чат {chatId.slice(-6)}</span>
        {onlineTotal > 0 && (
          <div className={styles.onlineBlock}>
            <span className={styles.onlineLabel}>
              В чате: {onlineMembers.length} из {onlineTotal}
            </span>
            <div className={styles.onlineAvatars}>
              {onlineMembers.slice(0, 8).map((m) => (
                <span key={m.id} className={styles.onlineAvatar} title={m.name}>
                  {m.name.slice(0, 1).toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}
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
              {msg.media?.type === "videoNote" && msg.media.url && (
                <div
                  className={`${styles.mediaBubble} ${playingVideoId === msg.id ? styles.mediaBubblePlaying : ""}`}
                  onClick={() => onVideoNoteClick(msg.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onVideoNoteClick(msg.id)}
                  aria-label="Воспроизвести видеокружок"
                >
                  <video
                    ref={(el) => {
                      videoRefs.current[msg.id] = el;
                    }}
                    src={msg.media.url}
                    className={styles.videoNote}
                    preload="metadata"
                    muted
                    playsInline
                    onTimeUpdate={() => onVideoTimeUpdate(msg.id)}
                    onEnded={onVideoEnded}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {playingVideoId === msg.id && (
                    <svg className={styles.videoProgressRing} viewBox="0 0 200 200" aria-hidden>
                      <circle className={styles.videoProgressTrack} cx="100" cy="100" r="97" />
                      <circle
                        className={styles.videoProgressFill}
                        cx="100"
                        cy="100"
                        r="97"
                        style={{
                          strokeDasharray: 2 * Math.PI * 97,
                          strokeDashoffset: 2 * Math.PI * 97 * (1 - (videoProgress[msg.id] ?? 0)),
                        }}
                      />
                    </svg>
                  )}
                  {msg.media.duration != null && (
                    <span className={styles.videoDuration}>{msg.media.duration} сек</span>
                  )}
                </div>
              )}
              {msg.text && <div className={styles.bubble}>{msg.text}</div>}
              {!msg.text && !msg.media && <div className={styles.bubble}>(медиа)</div>}
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
      {videoError && <div className={styles.videoError}>{videoError}</div>}
      <form onSubmit={sendMessage} className={styles.form}>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className={styles.hiddenInput}
          onChange={onVideoNoteSelect}
          disabled={videoUploading}
        />
        <button
          type="button"
          className={styles.videoBtn}
          onClick={() => setRecorderOpen(true)}
          disabled={videoUploading}
          title="Записать видеокружок"
        >
          {videoUploading ? "…" : "⏺"}
        </button>
        <button
          type="button"
          className={styles.videoBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={videoUploading}
          title="Загрузить видео из файла"
        >
          {videoUploading ? "…" : "📎"}
        </button>
        <VideoNoteRecorder
          open={recorderOpen}
          onClose={() => setRecorderOpen(false)}
          onSend={onRecordedVideoNoteSend}
        />
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
