import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createStory } from "../api/stories";
import type { CreateStoryPayload } from "../api/stories";
import styles from "./StoryNew.module.css";

export function StoryNew() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"text" | "photo">("text");
  const [text, setText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let payload: CreateStoryPayload;
    if (mode === "text") {
      if (!text.trim()) {
        setError("Введите текст");
        return;
      }
      payload = { type: "text", text: text.trim() };
    } else {
      if (!photoUrl.trim()) {
        setError("Введите ссылку на изображение");
        return;
      }
      payload = { type: "photo", media: { url: photoUrl.trim() } };
    }
    setSaving(true);
    try {
      await createStory(payload);
      navigate("/stories", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка создания");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/stories" className={styles.back}>
          ← Истории
        </Link>
        <h1 className={styles.logo}>Новая история</h1>
      </header>
      <main className={styles.main}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.tabs}>
            <button
              type="button"
              className={mode === "text" ? styles.tabActive : styles.tab}
              onClick={() => setMode("text")}
            >
              Текст
            </button>
            <button
              type="button"
              className={mode === "photo" ? styles.tabActive : styles.tab}
              onClick={() => setMode("photo")}
            >
              Фото (URL)
            </button>
          </div>
          {mode === "text" && (
            <div className={styles.field}>
              <label className={styles.label}>Текст</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={styles.textarea}
                rows={5}
                maxLength={500}
                placeholder="Что у вас нового?"
              />
              <span className={styles.hint}>{text.length}/500</span>
            </div>
          )}
          {mode === "photo" && (
            <div className={styles.field}>
              <label className={styles.label}>Ссылка на изображение</label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className={styles.input}
                placeholder="https://..."
              />
            </div>
          )}
          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={saving}>
              {saving ? "Публикация…" : "Опубликовать"}
            </button>
            <Link to="/stories" className={styles.cancel}>
              Отмена
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
