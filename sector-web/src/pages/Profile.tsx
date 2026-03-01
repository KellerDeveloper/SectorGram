import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateMe } from "../api/users";
import type { UpdateMePayload } from "../api/users";
import { registerPushToken } from "../api/notifications";
import { AppLogo } from "../components/AppLogo";
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
  const [pushToken, setPushToken] = useState("");
  const [pushSaving, setPushSaving] = useState(false);
  const [pushMessage, setPushMessage] = useState("");

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

  async function handleRegisterPush() {
    const token = pushToken.trim();
    if (!token) {
      setPushMessage("Введите токен");
      return;
    }
    setPushMessage("");
    setPushSaving(true);
    try {
      await registerPushToken(token);
      setPushMessage("Токен сохранён. Уведомления будут приходить на это устройство.");
    } catch (err: unknown) {
      setPushMessage(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setPushSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <AppLogo />
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

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Уведомления</h3>
            <p className={styles.sectionHint}>
              Для получения push-уведомлений зарегистрируйте токен устройства (например, Expo Push Token).
            </p>
            <div className={styles.pushRow}>
              <input
                type="text"
                value={pushToken}
                onChange={(e) => setPushToken(e.target.value)}
                className={styles.input}
                placeholder="Expo Push Token или endpoint"
              />
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={handleRegisterPush}
                disabled={pushSaving}
              >
                {pushSaving ? "…" : "Зарегистрировать"}
              </button>
            </div>
            {pushMessage && (
              <p className={pushMessage.startsWith("Токен") ? styles.pushSuccess : styles.pushError}>
                {pushMessage}
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
