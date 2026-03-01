import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getUserStories, viewStory, deleteStory } from "../api/stories";
import type { StoryItem, UserStoriesData } from "../api/stories";
import { useAuth } from "../context/AuthContext";
import styles from "./StoryView.module.css";

export function StoryView() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<UserStoriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getUserStories(userId)
      .then((d) => {
        if (!cancelled) setData(d);
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
  }, [userId]);

  const stories = data?.stories ?? [];
  const current = stories[index];
  const isOwner = data?.userId === user?.id;

  useEffect(() => {
    if (!current?.id || viewedIds.has(current.id)) return;
    viewStory(current.id).catch(() => {});
    setViewedIds((prev) => new Set(prev).add(current.id));
  }, [current?.id, viewedIds]);

  function goNext() {
    if (index < stories.length - 1) setIndex((i) => i + 1);
    else setIndex(-1);
  }

  function goPrev() {
    if (index > 0) setIndex((i) => i - 1);
  }

  async function handleDelete() {
    if (!current || !isOwner) return;
    try {
      await deleteStory(current.id);
      setData((prev) => {
        if (!prev) return prev;
        const next = prev.stories.filter((s) => s.id !== current.id);
        if (next.length === 0) return null;
        return { ...prev, stories: next };
      });
      if (index >= stories.length - 1) setIndex(stories.length - 2);
      else setIndex((i) => Math.max(0, i - 1));
    } catch {
      setError("Не удалось удалить");
    }
  }

  if (loading) return <div className={styles.layout}><div className={styles.loading}>Загрузка…</div></div>;
  if (error && !data) return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/stories" className={styles.back}>← Истории</Link>
      </header>
      <div className={styles.error}>{error}</div>
    </div>
  );
  if (!data || stories.length === 0) return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/stories" className={styles.back}>← Истории</Link>
      </header>
      <p className={styles.empty}>Нет историй.</p>
    </div>
  );

  if (index < 0) {
    return (
      <div className={styles.layout}>
        <header className={styles.header}>
          <Link to="/stories" className={styles.back}>← Истории</Link>
        </header>
        <p className={styles.empty}>Все просмотрены. <Link to="/stories">К ленте</Link></p>
      </div>
    );
  }

  const story = stories[index];

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/stories" className={styles.back}>← Истории</Link>
        <span className={styles.userName}>{data.user?.name}</span>
        {isOwner && (
          <button type="button" className={styles.deleteBtn} onClick={handleDelete}>
            Удалить
          </button>
        )}
      </header>
      <div className={styles.storyArea}>
        <button type="button" className={styles.sideBtn} onClick={goPrev} aria-label="Назад" style={{ left: 0 }} />
        <div className={styles.content}>
          {story.type === "text" && (
            <div className={styles.textStory}>{story.text}</div>
          )}
          {story.type === "photo" && story.media?.url && (
            <img src={story.media.url} alt="" className={styles.photoStory} />
          )}
        </div>
        <button type="button" className={styles.sideBtn} onClick={goNext} aria-label="Далее" style={{ right: 0 }} />
      </div>
      <div className={styles.progress}>
        {stories.map((_, i) => (
          <div
            key={i}
            className={i === index ? styles.progressActive : styles.progressDot}
          />
        ))}
      </div>
    </div>
  );
}
