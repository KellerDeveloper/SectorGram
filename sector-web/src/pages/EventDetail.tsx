import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getEvent, joinEvent, leaveEvent } from "../api/events";
import type { Event } from "../api/events";
import { useAuth } from "../context/AuthContext";
import styles from "./EventDetail.module.css";

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getEvent(id)
      .then((ev) => {
        if (!cancelled) setEvent(ev);
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
  }, [id]);

  const isParticipant = event?.participants?.some((p) => p.id === user?.id) ?? false;
  const isCreator = event?.creatorId === user?.id;

  async function handleJoin() {
    if (!id || actionLoading) return;
    setActionLoading(true);
    try {
      const updated = await joinEvent(id);
      setEvent(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLeave() {
    if (!id || actionLoading || isCreator) return;
    setActionLoading(true);
    try {
      const updated = await leaveEvent(id);
      setEvent(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setActionLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("ru", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) return <div className={styles.layout}><div className={styles.loading}>Загрузка…</div></div>;
  if (error && !event) return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/events" className={styles.back}>← События</Link>
      </header>
      <div className={styles.error}>{error}</div>
    </div>
  );
  if (!event) return null;

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/events" className={styles.back}>
          ← События
        </Link>
        <h1 className={styles.logo}>{event.title}</h1>
      </header>
      <main className={styles.main}>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.card}>
          <div className={styles.meta}>
            <span>{formatDate(event.startsAt)}</span>
            {event.endsAt && <span> — {formatDate(event.endsAt)}</span>}
          </div>
          <p className={styles.place}>{event.place}</p>
          {event.description && (
            <div className={styles.description}>{event.description}</div>
          )}
          {event.creator && (
            <p className={styles.creator}>
              Создатель: {event.creator.name}
            </p>
          )}
          <p className={styles.participants}>
            Участников: {event.participants?.length ?? 0}
          </p>
          {event.chatId && (
            <Link to={`/chat/${event.chatId}`} className={styles.chatLink}>
              Перейти в чат события
            </Link>
          )}
          <div className={styles.actions}>
            {!isParticipant && !isCreator && (
              <button
                type="button"
                className={styles.button}
                onClick={handleJoin}
                disabled={actionLoading}
              >
                {actionLoading ? "…" : "Участвовать"}
              </button>
            )}
            {isParticipant && !isCreator && (
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={handleLeave}
                disabled={actionLoading}
              >
                {actionLoading ? "…" : "Выйти из события"}
              </button>
            )}
            {isCreator && (
              <span className={styles.badge}>Вы создатель</span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
