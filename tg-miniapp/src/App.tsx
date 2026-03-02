import { useEffect, useState } from 'react'
import './App.css'
import type { Event } from './api/events'
import { getEvents, joinEvent, leaveEvent } from './api/events'
import type { CurrentUser } from './api/users'
import { getCurrentUser } from './api/users'
import { setToken } from './api/client'
import { loginWithTelegramWebApp } from './api/auth'

type Filter = 'all' | 'mine'

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
  const [filter, setFilter] = useState<Filter>('all')
  const [actionEventId, setActionEventId] = useState<string | null>(null)

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
            'Нет авторизации. Откройте мини‑приложение из Telegram или войдите в Sector в браузере.',
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
        'Нет авторизации. Войдите в Sector в браузере, чтобы отмечаться на событиях.',
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
          <h1 className="app-title">Мероприятия Sector (mini‑app)</h1>
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
      </header>

      <main className="app-main">
        {loading && <div className="state state--muted">Загрузка…</div>}
        {!loading && error && (
          <div className="state state--error">{error}</div>
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

              return (
                <li key={ev.id} className="event-card">
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

                  <div className="event-footer">
                    <span className="event-participants">
                      Участников: {ev.participants?.length ?? 0}
                    </span>
                    <button
                      type="button"
                      className={`event-action ${
                        going ? 'event-action--secondary' : 'event-action--primary'
                      }`}
                      onClick={() => handleToggleParticipation(ev)}
                      disabled={isBusy}
                    >
                      {isBusy
                        ? '…'
                        : going
                          ? 'Не иду'
                          : 'Иду'}
                    </button>
                  </div>
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
