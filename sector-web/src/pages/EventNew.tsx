import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createEvent } from "../api/events";
import type { CreateEventPayload } from "../api/events";
import { PlaceSearch } from "../components/PlaceSearch";
import { YandexEventMap } from "../components/YandexEventMap";
import styles from "./EventNew.module.css";

const DEFAULT_MAP_CENTER: [number, number] = [55.75, 37.62];

export function EventNew() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ymapsReady, setYmapsReady] = useState(!!(typeof window !== "undefined" && window.ymaps));
  const yandexApiKey = import.meta.env.VITE_YANDEX_MAP_API_KEY ?? "";

  useEffect(() => {
    if (!yandexApiKey) return;
    if (window.ymaps) setYmapsReady(true);
    const id = setInterval(() => {
      if (window.ymaps) {
        setYmapsReady(true);
        clearInterval(id);
      }
    }, 300);
    return () => clearInterval(id);
  }, [yandexApiKey]);

  function toISOLocal(dateStr: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !place.trim() || !startsAt) {
      setError("Заполните название, место и дату начала");
      return;
    }
    setSaving(true);
    try {
      const payload: CreateEventPayload = {
        title: title.trim(),
        place: place.trim(),
        startsAt: toISOLocal(startsAt),
      };
      if (endsAt) payload.endsAt = toISOLocal(endsAt);
      if (description.trim()) payload.description = description.trim();
      if (location) payload.location = location;
      const event = await createEvent(payload);
      navigate(`/events/${event.id}`, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка создания");
    } finally {
      setSaving(false);
    }
  }

  const minDatetime = new Date().toISOString().slice(0, 16);

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/events" className={styles.back}>
          ← События
        </Link>
        <h1 className={styles.logo}>Новое событие</h1>
      </header>
      <main className={styles.main}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.field}>
            <label className={styles.label}>Название *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Место *</label>
            <input
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className={styles.input}
              required
            />
            {yandexApiKey && (
              <div className={styles.placeSearch}>
                <PlaceSearch
                  ymapsReady={ymapsReady}
                  placeholder="Адрес или название места"
                  onSelect={(r) => {
                    setPlace(r.placeName);
                    setLocation({ latitude: r.latitude, longitude: r.longitude });
                  }}
                />
              </div>
            )}
          </div>
          {yandexApiKey && (
            <div className={styles.field}>
              <label className={styles.label}>Точка на карте</label>
              <p className={styles.hint}>Клик по карте — отметить место проведения</p>
              <YandexEventMap
                apiKey={yandexApiKey}
                center={location ? [location.latitude, location.longitude] : DEFAULT_MAP_CENTER}
                mode="pick"
                onPointSelect={(lat, lon) => setLocation({ latitude: lat, longitude: lon })}
                className={styles.map}
              />
              {location && (
                <button
                  type="button"
                  className={styles.clearMap}
                  onClick={() => setLocation(null)}
                >
                  Убрать точку с карты
                </button>
              )}
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label}>Начало *</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={styles.input}
              min={minDatetime}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Окончание</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={styles.input}
              min={startsAt || minDatetime}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              rows={4}
            />
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={saving}>
              {saving ? "Создание…" : "Создать"}
            </button>
            <Link to="/events" className={styles.cancel}>
              Отмена
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
