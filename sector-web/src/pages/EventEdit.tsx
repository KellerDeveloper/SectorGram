import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getEvent, updateEvent } from "../api/events";
import type { UpdateEventPayload, Event } from "../api/events";
import { PlaceSearch } from "../components/PlaceSearch";
import { YandexEventMap } from "../components/YandexEventMap";
import styles from "./EventNew.module.css";

const DEFAULT_MAP_CENTER: [number, number] = [55.75, 37.62];

export function EventEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loadedEvent, setLoadedEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ymapsReady, setYmapsReady] = useState(
    !!(typeof window !== "undefined" && (window as any).ymaps)
  );
  const yandexApiKey = import.meta.env.VITE_YANDEX_MAP_API_KEY ?? "";

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getEvent(id)
      .then((ev) => {
        if (cancelled) return;
        setLoadedEvent(ev);
        setTitle(ev.title ?? "");
        setPlace(ev.place ?? "");
        setDescription(ev.description ?? "");
        if (ev.startsAt) {
          setStartsAt(toInputDatetime(ev.startsAt));
        }
        if (ev.endsAt) {
          setEndsAt(toInputDatetime(ev.endsAt));
        }
        if (ev.location && ev.location.latitude != null && ev.location.longitude != null) {
          setLocation({
            latitude: ev.location.latitude,
            longitude: ev.location.longitude,
          });
        } else {
          setLocation(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Ошибка загрузки события");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!yandexApiKey) return;
    if ((window as any).ymaps) setYmapsReady(true);
    const id = window.setInterval(() => {
      if ((window as any).ymaps) {
        setYmapsReady(true);
        window.clearInterval(id);
      }
    }, 300);
    return () => window.clearInterval(id);
  }, [yandexApiKey]);

  function toISOLocal(dateStr: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toISOString();
  }

  function toInputDatetime(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toISOString().slice(0, 16);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!id) {
      setError("Некорректный идентификатор события");
      return;
    }
    if (!title.trim() || !place.trim() || !startsAt) {
      setError("Заполните название, адрес и дату начала");
      return;
    }
    setSaving(true);
    try {
      const payload: UpdateEventPayload = {
        title: title.trim(),
        place: place.trim(),
        startsAt: toISOLocal(startsAt),
      };
      if (endsAt) payload.endsAt = toISOLocal(endsAt);
      payload.description = description.trim();
      if (location) payload.location = location;

      const updated = await updateEvent(id, payload);
      navigate(`/events/${updated.id}`, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  const minDatetime = new Date().toISOString().slice(0, 16);

  if (loading) {
    return (
      <div className={styles.layout}>
        <main className={styles.main}>
          <div className={styles.loading}>Загрузка…</div>
        </main>
      </div>
    );
  }

  if (!loadedEvent) {
    return (
      <div className={styles.layout}>
        <main className={styles.main}>
          <div className={styles.error}>{error || "Событие не найдено"}</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to={`/events/${loadedEvent.id}`} className={styles.back}>
          ← Назад
        </Link>
        <h1 className={styles.logo}>Редактирование события</h1>
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
          <div className={styles.fieldMap}>
            <label className={styles.label}>Точка на карте</label>
            <p className={styles.hint}>Клик по карте — отметить место проведения</p>
            {yandexApiKey ? (
              <>
                <YandexEventMap
                  apiKey={yandexApiKey}
                  center={
                    location ? [location.latitude, location.longitude] : DEFAULT_MAP_CENTER
                  }
                  mode="pick"
                  onPointSelect={(lat, lon) =>
                    setLocation({ latitude: lat, longitude: lon })
                  }
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
              </>
            ) : (
              <div className={styles.mapPlaceholder}>
                Чтобы выбрать место на карте, укажите ключ Яндекс.Карт в переменной{" "}
                <code>VITE_YANDEX_MAP_API_KEY</code> (получить:{" "}
                <a
                  href="https://developer.tech.yandex.ru/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  developer.tech.yandex.ru
                </a>
                ).
              </div>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Адрес *</label>
            <div className={styles.placeSearch}>
              {yandexApiKey ? (
                <PlaceSearch
                  ymapsReady={ymapsReady}
                  value={place}
                  onChange={setPlace}
                  placeholder="Введите адрес и нажмите «Найти»"
                  onSelect={(r) => {
                    setPlace(r.placeName);
                    setLocation({ latitude: r.latitude, longitude: r.longitude });
                  }}
                />
              ) : (
                <p className={styles.mapHint}>
                  Для поиска по адресу задайте <code>VITE_YANDEX_MAP_API_KEY</code> в .env
                </p>
              )}
            </div>
          </div>
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
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
            <Link to={`/events/${loadedEvent.id}`} className={styles.cancel}>
              Отмена
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

