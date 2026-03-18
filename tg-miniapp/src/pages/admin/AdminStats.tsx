import { useEffect, useState } from 'react'
import {
  adminStatsEvents,
  adminStatsUsers,
  type AdminStatsEvent,
  type AdminUserRow,
} from '../../api/admin'

export default function AdminStats() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [events, setEvents] = useState<AdminStatsEvent[]>([])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [usersRes, eventsRes] = await Promise.all([
        adminStatsUsers({ limit: 10 }),
        adminStatsEvents({ limit: 10 }),
      ])
      setUsers(usersRes.items || [])
      setEvents(eventsRes.items || [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось загрузить статистику'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="admin-section">
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="create-submit" disabled={loading} onClick={load}>
          {loading ? 'Загрузка…' : 'Обновить'}
        </button>
      </div>

      {error && <div className="state state--error">{error}</div>}
      {loading && <div className="state state--muted">Считаем статистику…</div>}

      {!loading && !error && (
        <>
          <section className="create-card" style={{ marginTop: 12 }}>
            <h2 className="create-card-title">Топ пользователей</h2>
            {users.length === 0 ? (
              <div className="state state--muted">Пусто</div>
            ) : (
              <ul className="events-list">
                {users.map((u, i) => (
                  <li key={u.userId} className="event-card">
                    <div className="event-header">
                      <div className="event-title-row">
                        <h3 className="event-title">#{i + 1} {u.name}</h3>
                      </div>
                      <div className="event-meta">
                        <span>Рейтинг: {u.ratingScore}</span>
                        <span>Создал: {u.createdEvents}</span>
                        <span>Посетил: {u.attendedEvents}</span>
                        <span>Интерес: {u.interestScore}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="create-card" style={{ marginTop: 12 }}>
            <h2 className="create-card-title">Топ событий</h2>
            {events.length === 0 ? (
              <div className="state state--muted">Пусто</div>
            ) : (
              <ul className="events-list">
                {events.map((e) => (
                  <li key={e.id} className="event-card">
                    <div className="event-header">
                      <div className="event-title-row">
                        <h3 className="event-title">{e.title}</h3>
                      </div>
                      <div className="event-meta">
                        <span>Участников: {e.participantsCount}</span>
                        <span>{new Date(e.startsAt).toLocaleString('ru')}</span>
                        <span>{e.place}</span>
                        <span>Статус: {e.status}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

