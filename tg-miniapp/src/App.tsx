import { useEffect, useState } from 'react'
import './App.css'
import type { Event, UpdateEventPayload } from './api/events'
import {
  getEvents,
  joinEvent,
  leaveEvent,
  createEvent,
  cancelEvent,
  updateEvent,
} from './api/events'
import { searchPlaces, type YandexPlace } from './api/yandex'
import { suggestMeetingIdea } from './api/ai'
import type { CurrentUser } from './api/users'
import { getCurrentUser } from './api/users'
import { setToken } from './api/client'
import { loginWithTelegramWebApp } from './api/auth'

type Filter = 'all' | 'mine'

function getYandexStaticMapUrl(lat: number, lon: number, zoom = 15) {
  const ll = `${lon},${lat}` // порядок: lon,lat
  const pt = `${lon},${lat},pm2rdl`
  const size = '450,240'
  return `https://static-maps.yandex.ru/1.x/?ll=${ll}&size=${size}&z=${zoom}&l=map&pt=${pt}`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('ru', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toInputDatetime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toISOString().slice(0, 16)
}

function toISOLocalFromInput(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  return d.toISOString()
}

function isUpcoming(ev: Event) {
  if (!ev.startsAt) return true
  const now = Date.now()
  const start = new Date(ev.startsAt).getTime()
  return start >= now - 60 * 60 * 1000
}

function getTelegramWebApp(): any | null {
  if (typeof window === 'undefined') return null
  const w = window as any
  return w.Telegram?.WebApp ?? null
}

function App() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeSearching, setPlaceSearching] = useState(false)
  const [placeResults, setPlaceResults] = useState<YandexPlace[]>([])
  const [selectedPlace, setSelectedPlace] = useState<YandexPlace | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [actionEventId, setActionEventId] = useState<string | null>(null)
  const [participantsEventId, setParticipantsEventId] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editPlace, setEditPlace] = useState('')
  const [editStartsAt, setEditStartsAt] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [ideaLoading, setIdeaLoading] = useState(false)
  const [ideaText, setIdeaText] = useState<string | null>(null)

  // Инициализация Telegram WebApp (цвета, размер)
  useEffect(() => {
    const tg = getTelegramWebApp()
    if (tg) {
      try {
        tg.ready()
        if (typeof tg.expand === 'function') {
          tg.expand()
        }
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    const q = placeQuery.trim()
    if (q.length < 4) {
      setPlaceSearching(false)
      setPlaceResults([])
      return
    }

    let cancelled = false

    async function run() {
      setPlaceSearching(true)
      try {
        const results = await searchPlaces(q)
        if (cancelled) return
        setPlaceResults(results)
      } catch (err) {
        if (cancelled) return
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Не удалось выполнить поиск по карте')
        }
      } finally {
        if (!cancelled) {
          setPlaceSearching(false)
        }
      }
    }

    const timeout = setTimeout(run, 500)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [placeQuery])

  async function handleCreateEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) {
      setError(
        'Нет авторизации. Войдите в SEKTOR в браузере, чтобы создавать мероприятия.',
      )
      return
    }
    if (creating) return

    const form = e.currentTarget
    const data = new FormData(form)
    const title = (data.get('title') as string | null)?.trim() ?? ''
    const startsAtRaw = (data.get('startsAt') as string | null)?.trim() ?? ''
    const description = (data.get('description') as string | null)?.trim() ?? ''

    const place = placeQuery.trim() || selectedPlace?.label || ''

    if (!title || !place || !startsAtRaw) {
      setError('Заполните название, дату/время и место.')
      return
    }

    let startsAtIso: string
    try {
      startsAtIso = new Date(startsAtRaw).toISOString()
    } catch {
      setError('Некорректная дата/время начала.')
      return
    }

    setCreating(true)
    setError('')
    try {
      const created = await createEvent({
        title,
        place,
        startsAt: startsAtIso,
        description: description || undefined,
        location: selectedPlace
          ? {
              latitude: selectedPlace.latitude,
              longitude: selectedPlace.longitude,
            }
          : undefined,
      })
      setEvents((prev) => [...prev, created])
      setShowCreateForm(false)
      form.reset()
      setPlaceQuery('')
      setSelectedPlace(null)
      setIdeaText(null)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Не удалось создать мероприятие')
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleSuggestMeetingIdea() {
    if (!user || ideaLoading) return
    setIdeaLoading(true)
    setIdeaText(null)
    setError('')
    try {
      const { ideas } = await suggestMeetingIdea({ city: 'Москва' })
      setIdeaText(ideas)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Не удалось получить идеи')
      }
    } finally {
      setIdeaLoading(false)
    }
  }

  function applyIdeaLine(line: string) {
    const trimmed = line.trim()
    if (!trimmed) return
    const dash = ' — '
    const idx = trimmed.indexOf(dash)
    if (idx !== -1) {
      const title = trimmed.slice(0, idx).trim()
      const place = trimmed.slice(idx + dash.length).trim()
      const form = document.getElementById('create-form') as HTMLFormElement | null
      if (form) {
        const titleInput = form.querySelector<HTMLInputElement>('[name="title"]')
        const placeInput = form.querySelector<HTMLInputElement>('[name="place"]')
        if (titleInput) titleInput.value = title
        if (placeInput) placeInput.value = place
      }
      setPlaceQuery(place)
      setSelectedPlace(null)
    } else {
      const form = document.getElementById('create-form') as HTMLFormElement | null
      const titleInput = form?.querySelector<HTMLInputElement>('[name="title"]')
      if (titleInput) titleInput.value = trimmed
    }
    setIdeaText(null)
  }

  async function handleDeleteEvent(ev: Event) {
    if (!user) {
      setError('Нет авторизации. Войдите в SEKTOR в браузере.')
      return
    }
    if (actionEventId) return

    // Лёгкое подтверждение, чтобы не удалить случайно
    if (!window.confirm('Удалить это мероприятие?')) return

    setActionEventId(ev.id)
    setError('')
    try {
      await cancelEvent(ev.id)
      setEvents((prev) => prev.filter((e) => e.id !== ev.id))
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Не удалось удалить мероприятие')
      }
    } finally {
      setActionEventId(null)
    }
  }

  function startEditEvent(ev: Event) {
    setEditingEventId(ev.id)
    setEditTitle(ev.title ?? '')
    setEditPlace(ev.place ?? '')
    setEditDescription(ev.description ?? '')
    setEditStartsAt(ev.startsAt ? toInputDatetime(ev.startsAt) : '')
    setError('')
  }

  function cancelEditEvent() {
    setEditingEventId(null)
    setEditing(false)
    setEditTitle('')
    setEditPlace('')
    setEditStartsAt('')
    setEditDescription('')
  }

  async function handleEditEvent(ev: Event) {
    if (!user) {
      setError('Нет авторизации. Войдите в SEKTOR в браузере.')
      return
    }
    if (editing) return

    const title = editTitle.trim()
    const place = editPlace.trim()
    const startsAtRaw = editStartsAt.trim()
    const description = editDescription.trim()

    if (!title || !place || !startsAtRaw) {
      setError('Заполните название, дату/время и место.')
      return
    }

    let startsAtIso: string
    try {
      startsAtIso = toISOLocalFromInput(startsAtRaw)
    } catch {
      setError('Некорректная дата/время начала.')
      return
    }

    setEditing(true)
    setError('')
    try {
      const payload: UpdateEventPayload = {
        title,
        place,
        startsAt: startsAtIso,
        description: description || undefined,
      }

      const updated = await updateEvent(ev.id, payload)
      setEvents((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e)),
      )
      cancelEditEvent()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Не удалось сохранить изменения')
      }
    } finally {
      setEditing(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        let me: CurrentUser | null = null

        const tg = getTelegramWebApp()
        const initData =
          tg && typeof tg.initData === 'string' ? (tg.initData as string) : ''

        // Если mini‑app действительно запущен внутри Telegram, initData будет непустой строкой.
        // В этом случае авторизуемся через Telegram WebApp, игнорируя локальный токен.
        if (initData) {
          try {
            const auth = await loginWithTelegramWebApp(initData)
            if (cancelled) return
            setToken(auth.token)
            me = {
              id: auth.user.id,
              name: auth.user.name,
              email: auth.user.email,
              avatar: auth.user.avatar ?? null,
            }
          } catch (authErr) {
            console.error('Telegram WebApp auth failed', authErr)
          }
        }

        const [userFromApi, list] = await Promise.all([
          me ? Promise.resolve(me) : getCurrentUser(),
          getEvents(),
        ])
        if (cancelled) return
        setUser(userFromApi)
        setEvents(Array.isArray(list) ? list : [])
      } catch (err) {
        if (cancelled) return
        if (err instanceof Error && (err as Error & { status?: number }).status === 401) {
          setError(
            'Нет авторизации. Откройте мини‑приложение из Telegram или войдите в SEKTOR в браузере.',
          )
        } else if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Ошибка загрузки данных')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  function isParticipant(ev: Event): boolean {
    return ev.participants?.some((p) => p.id === user?.id) ?? false
  }

  const visibleEvents = events
    .filter((ev) => isUpcoming(ev))
    .filter((ev) => {
      if (filter === 'mine') {
        return isParticipant(ev)
      }
      return true
    })
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )

  async function handleToggleParticipation(ev: Event) {
    if (!user) {
      setError(
        'Нет авторизации. Войдите в SEKTOR в браузере, чтобы отмечаться на событиях.',
      )
      return
    }
    if (actionEventId) return

    setActionEventId(ev.id)
    setError('')
    try {
      const updated = await (isParticipant(ev)
        ? leaveEvent(ev.id)
        : joinEvent(ev.id))
      setEvents((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e)),
      )
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Не удалось обновить участие')
      }
    } finally {
      setActionEventId(null)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-main">
          <h1 className="app-title">Сектор х Москва</h1>
          {user && <div className="app-user">👤 {user.name}</div>}
        </div>
        <p className="app-subtitle">
          Отслеживайте предстоящие события и отмечайтесь, где вы участвуете.
        </p>
        <div className="app-filters">
          <button
            type="button"
            className={`filter-button ${
              filter === 'all' ? 'filter-button--active' : ''
            }`}
            onClick={() => setFilter('all')}
          >
            Все
          </button>
          <button
            type="button"
            className={`filter-button ${
              filter === 'mine' ? 'filter-button--active' : ''
            }`}
            onClick={() => setFilter('mine')}
          >
            Я иду
          </button>
        </div>
        {user && (
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              className="event-action event-action--primary"
              onClick={() => setShowCreateForm((v) => !v)}
            >
              {showCreateForm ? 'Отменить' : 'Создать мероприятие'}
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {loading && <div className="state state--muted">Загрузка…</div>}
        {!loading && error && (
          <div className="state state--error">{error}</div>
        )}

        {!loading && user && showCreateForm && (
          <section className="create-card">
            <h2 className="create-card-title">Новое мероприятие</h2>
            <button
              type="button"
              className="create-idea-button"
              onClick={handleSuggestMeetingIdea}
              disabled={ideaLoading}
            >
              {ideaLoading ? 'Генерируем идеи…' : 'Посоветовать идею для встречи'}
            </button>
            {ideaText && (
              <div className="create-idea-result">
                <p className="create-idea-label">Куда сходить:</p>
                {ideaText
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line, i) => (
                    <button
                      key={i}
                      type="button"
                      className="create-idea-line"
                      onClick={() => applyIdeaLine(line)}
                    >
                      {line}
                    </button>
                  ))}
              </div>
            )}
            <form id="create-form" className="create-form" onSubmit={handleCreateEvent}>
              <div className="create-form-row">
                <label htmlFor="title">Название</label>
                <input
                  id="title"
                  name="title"
                  className="create-input"
                  type="text"
                  placeholder="Например, боулинг"
                  required
                />
              </div>
              <div className="create-form-row">
                <label htmlFor="startsAt">Дата и время</label>
                <input
                  id="startsAt"
                  name="startsAt"
                  className="create-input"
                  type="datetime-local"
                  required
                />
              </div>
              <div className="create-form-row">
                <label htmlFor="place">Место</label>
                <input
                  id="place"
                  name="place"
                  className="create-input"
                  type="text"
                  placeholder="Адрес или название площадки"
                  value={placeQuery}
                  onChange={(e) => {
                    setPlaceQuery(e.target.value)
                    setSelectedPlace(null)
                setPlaceResults([])
                  }}
                  required
                />
            {placeQuery.trim().length >= 4 &&
              !placeSearching &&
              placeResults.length > 0 && (
                <ul className="place-suggestions">
                  {placeResults.map((place, index) => (
                    <li key={`${place.latitude}-${place.longitude}-${index}`}>
                      <button
                        type="button"
                        className="place-suggestion"
                        onClick={() => {
                          setPlaceQuery(place.label)
                          setSelectedPlace(place)
                          setPlaceResults([])
                        }}
                      >
                        {place.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
                {placeQuery.trim().length >= 4 && placeSearching && (
                  <div className="place-hint">Поиск по карте…</div>
                )}
                {selectedPlace && (
                  <>
                    <div className="create-place-selected">
                      Координаты: {selectedPlace.latitude.toFixed(5)},{' '}
                      {selectedPlace.longitude.toFixed(5)}
                    </div>
                    <div className="create-map-preview">
                      <img
                        src={getYandexStaticMapUrl(
                          selectedPlace.latitude,
                          selectedPlace.longitude,
                        )}
                        alt="Карта выбранного места"
                        className="map-image"
                        loading="lazy"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="create-form-row">
                <label htmlFor="description">Описание</label>
                <textarea
                  id="description"
                  name="description"
                  className="create-textarea"
                  placeholder="Коротко опишите, что будет"
                />
              </div>
              <div className="create-actions">
                <button
                  type="button"
                  className="create-cancel"
                  onClick={() => {
                    setShowCreateForm(false)
                    setIdeaText(null)
                  }}
                  disabled={creating}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="create-submit"
                  disabled={creating}
                >
                  {creating ? 'Создание…' : 'Создать'}
                </button>
              </div>
            </form>
          </section>
        )}

        {!loading && !error && visibleEvents.length === 0 && (
          <div className="state state--muted">
            Нет предстоящих мероприятий.
          </div>
        )}

        {!loading && !error && visibleEvents.length > 0 && (
          <ul className="events-list">
            {visibleEvents.map((ev) => {
              const going = isParticipant(ev)
              const isBusy = actionEventId === ev.id
              const isCreator = ev.creatorId === user?.id

              return (
                <li key={ev.id} className="event-card">
                  <div className="event-main-clickable">
                    <div className="event-header">
                      <div className="event-title-row">
                        <h2 className="event-title">{ev.title}</h2>
                        {going && <span className="event-badge">Иду</span>}
                      </div>
                      <div className="event-meta">
                        <span className="event-date">
                          {formatDate(ev.startsAt)}
                        </span>
                        <span className="event-place">{ev.place}</span>
                      </div>
                    </div>

                    {ev.description && (
                      <p className="event-description">{ev.description}</p>
                    )}

                    {ev.location &&
                      typeof ev.location.latitude === 'number' &&
                      typeof ev.location.longitude === 'number' && (
                        <div className="event-map-preview">
                          <img
                            src={getYandexStaticMapUrl(
                              ev.location.latitude,
                              ev.location.longitude,
                            )}
                            alt="Карта места проведения"
                            className="map-image"
                            loading="lazy"
                          />
                        </div>
                      )}
                  </div>

                  <div className="event-footer">
                    <span className="event-participants">
                      Участников: {ev.participants?.length ?? 0}
                    </span>
                    {isCreator ? (
                      <div className="event-footer-actions">
                        <button
                          type="button"
                          className="event-action event-action--primary"
                          onClick={() => startEditEvent(ev)}
                          disabled={isBusy}
                        >
                          {editingEventId === ev.id && editing ? 'Сохранение…' : 'Редактировать'}
                        </button>
                        <button
                          type="button"
                          className="event-action event-action--secondary"
                          onClick={() => handleDeleteEvent(ev)}
                          disabled={isBusy}
                        >
                          {isBusy ? '…' : 'Удалить'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={`event-action ${
                          going ? 'event-action--secondary' : 'event-action--primary'
                        }`}
                        onClick={() => handleToggleParticipation(ev)}
                        disabled={isBusy}
                      >
                        {isBusy ? '…' : going ? 'Не иду' : 'Иду'}
                      </button>
                    )}
                  </div>
                  {isCreator && editingEventId === ev.id && (
                    <div className="event-edit-card">
                      <h3 className="event-edit-title">Редактировать событие</h3>
                      <div className="create-form-row">
                        <label htmlFor={`edit-title-${ev.id}`}>Название</label>
                        <input
                          id={`edit-title-${ev.id}`}
                          className="create-input"
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                      </div>
                      <div className="create-form-row">
                        <label htmlFor={`edit-startsAt-${ev.id}`}>Дата и время</label>
                        <input
                          id={`edit-startsAt-${ev.id}`}
                          className="create-input"
                          type="datetime-local"
                          value={editStartsAt}
                          onChange={(e) => setEditStartsAt(e.target.value)}
                        />
                      </div>
                      <div className="create-form-row">
                        <label htmlFor={`edit-place-${ev.id}`}>Место</label>
                        <input
                          id={`edit-place-${ev.id}`}
                          className="create-input"
                          type="text"
                          value={editPlace}
                          onChange={(e) => setEditPlace(e.target.value)}
                        />
                      </div>
                      <div className="create-form-row">
                        <label htmlFor={`edit-description-${ev.id}`}>Описание</label>
                        <textarea
                          id={`edit-description-${ev.id}`}
                          className="create-textarea"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                        />
                      </div>
                      <div className="create-actions">
                        <button
                          type="button"
                          className="create-cancel"
                          onClick={cancelEditEvent}
                          disabled={editing}
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          className="create-submit"
                          onClick={() => handleEditEvent(ev)}
                          disabled={editing}
                        >
                          {editing ? 'Сохранение…' : 'Сохранить'}
                        </button>
                      </div>
                    </div>
                  )}
                  {ev.participants && ev.participants.length > 0 && (
                    <div className="event-participants-actions">
                      <button
                        type="button"
                        className="event-map-button"
                        onClick={() =>
                          setParticipantsEventId((current) =>
                            current === ev.id ? null : ev.id,
                          )
                        }
                      >
                        {participantsEventId === ev.id
                          ? 'Скрыть участников'
                          : 'Посмотреть участников'}
                      </button>
                    </div>
                  )}
                  {participantsEventId === ev.id && ev.participants?.length > 0 && (
                    <ul className="participants-list">
                      {ev.participants.map((p) => (
                        <li key={p.id} className="participants-list-item">
                          <span className="participant-name">
                            {p.name || 'Без имени'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {ev.location &&
                    typeof ev.location.latitude === 'number' &&
                    typeof ev.location.longitude === 'number' && (
                      <div className="event-map-actions">
                        <button
                          type="button"
                          className="event-map-button"
                          onClick={() =>
                            window.open(
                              `https://yandex.ru/maps/?rtext=~${ev.location!.latitude},${ev.location!.longitude}`,
                              '_blank',
                            )
                          }
                        >
                          Построить маршрут
                        </button>
                        <button
                          type="button"
                          className="event-map-button"
                          onClick={() =>
                            window.open(
                              `https://yandex.ru/maps/?ll=${ev.location!.longitude},${ev.location!.latitude}&z=16&pt=${ev.location!.longitude},${ev.location!.latitude},pm2rdl`,
                              '_blank',
                            )
                          }
                        >
                          Открыть в Яндекс.Картах
                        </button>
                      </div>
                    )}
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}

export default App
