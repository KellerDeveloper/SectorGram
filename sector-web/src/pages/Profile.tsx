import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateMe } from "../api/users";
import type { UpdateMePayload } from "../api/users";
import styles from "./Profile.module.css";

export function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setUsername(user.username ?? "");
      setBio(user.bio ?? "");
      setAvatar(user.avatar ?? "");
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload: UpdateMePayload = {
        name: name.trim() || undefined,
        username: username.trim() || null,
        bio: bio.trim() || null,
        avatar: avatar.trim() || null,
      };
      await updateMe(payload);
      await refreshUser();
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Sector</h1>
        <div className={styles.nav}>
          <Link to="/" className={styles.link}>
            Чаты
          </Link>
          <Link to="/" className={styles.link}>
            На главную
          </Link>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.card}>
          <h2 className={styles.title}>Профиль</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.field}>
              <label className={styles.label}>Имя</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={styles.input}
                placeholder="без @"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>О себе</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className={styles.textarea}
                rows={3}
                maxLength={200}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Ссылка на аватар (URL)</label>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className={styles.input}
                placeholder="https://..."
              />
            </div>
            <div className={styles.actions}>
              <button type="submit" className={styles.button} disabled={saving}>
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
              <Link to="/" className={styles.cancel}>
                Отмена
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
