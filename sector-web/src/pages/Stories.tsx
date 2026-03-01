import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStories } from "../api/stories";
import type { StoryFeedUser } from "../api/stories";
import { useAuth } from "../context/AuthContext";
import styles from "./Stories.module.css";

export function Stories() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<StoryFeedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getStories()
      .then((list) => {
        if (!cancelled) setFeed(list);
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

  const myEntry = feed.find((e) => e.userId === user?.id);

  /** Есть ли непросмотренные истории у этого пользователя (для градиентной обводки как в ТГ) */
  const hasUnseen = (entry: StoryFeedUser) => {
    if (!user?.id) return false;
    return entry.stories.some(
      (s) => !(s.viewedBy ?? []).some((v) => v.userId === user.id)
    );
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Sector</h1>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            Чаты
          </Link>
          <Link to="/events" className={styles.navLink}>
            События
          </Link>
          <Link to="/stories" className={styles.navLinkActive}>
            Истории
          </Link>
          <Link to="/profile" className={styles.navLink}>
            Профиль
          </Link>
          <Link to="/stories/new" className={styles.newStory}>
            Добавить историю
          </Link>
        </nav>
      </header>
      <main className={styles.main}>
        <h2 className={styles.title}>Истории</h2>
        {error && <div className={styles.error}>{error}</div>}
        {loading ? (
          <div className={styles.loading}>Загрузка…</div>
        ) : (
          <div className={styles.feed}>
            {myEntry && (
              <Link to={`/stories/${myEntry.userId}`} className={styles.userCard}>
                <div className={styles.avatarWrap}>
                  <div className={`${styles.ring} ${styles.ringSeen}`}>
                    <span className={styles.avatar}>
                      {myEntry.user?.avatar ? (
                        <img src={myEntry.user.avatar} alt="" />
                      ) : (
                        myEntry.user?.name?.slice(0, 1).toUpperCase()
                      )}
                    </span>
                  </div>
                  <span className={styles.plus}>+</span>
                </div>
                <span className={styles.userName}>Мои истории</span>
              </Link>
            )}
            {feed
              .filter((e) => e.userId !== user?.id)
              .map((entry) => (
                <Link
                  key={entry.userId}
                  to={`/stories/${entry.userId}`}
                  className={styles.userCard}
                >
                  <div className={styles.avatarWrap}>
                    <div
                      className={`${styles.ring} ${hasUnseen(entry) ? styles.ringUnseen : styles.ringSeen}`}
                    >
                      <span className={styles.avatar}>
                        {entry.user?.avatar ? (
                          <img src={entry.user.avatar} alt="" />
                        ) : (
                          entry.user?.name?.slice(0, 1).toUpperCase()
                        )}
                      </span>
                    </div>
                  </div>
                  <span className={styles.userName}>{entry.user?.name ?? "Пользователь"}</span>
                </Link>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
