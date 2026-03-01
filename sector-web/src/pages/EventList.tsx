import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEvents } from "../api/events";
import type { Event } from "../api/events";
import { useAuth } from "../context/AuthContext";
import styles from "./EventList.module.css";

export function EventList() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getEvents()
      .then((list) => {
        if (!cancelled) setEvents(list);
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

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("ru", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isParticipant(ev: Event): boolean {
    return ev.participants?.some((p) => p.id === user?.id) ?? false;
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Sector</h1>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            Чаты
          </Link>
          <Link to="/events" className={styles.navLinkActive}>
            События
          </Link>
          <Link to="/profile" className={styles.navLink}>
            Профиль
          </Link>
          <Link to="/events/new" className={styles.newEvent}>
            Создать событие
          </Link>
        </nav>
      </header>
      <main className={styles.main}>
        <h2 className={styles.title}>События</h2>
        {error && <div className={styles.error}>{error}</div>}
        {loading ? (
          <div className={styles.loading}>Загрузка…</div>
        ) : events.length === 0 ? (
          <p className={styles.empty}>Нет предстоящих событий.</p>
        ) : (
          <ul className={styles.list}>
            {events.map((ev) => (
              <li key={ev.id}>
                <Link to={`/events/${ev.id}`} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>{ev.title}</span>
                    {isParticipant(ev) && (
                      <span className={styles.badge}>Участвую</span>
                    )}
                  </div>
                  <div className={styles.cardMeta}>
                    <span>{formatDate(ev.startsAt)}</span>
                    <span>{ev.place}</span>
                  </div>
                  {ev.description && (
                    <p className={styles.cardDesc}>{ev.description}</p>
                  )}
                  <div className={styles.cardFooter}>
                    Участников: {ev.participants?.length ?? 0}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
