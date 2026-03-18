import { useEffect, useMemo, useState } from 'react'
import type { AdminUserRow } from '../../api/admin'
import { adminGetUsers, adminGetUserDetails } from '../../api/admin'

type Props = {
  onBusyChange?: (busy: boolean) => void
}

export default function AdminUsers({ onBusyChange }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [details, setDetails] = useState<AdminUserRow | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const canSearch = useMemo(() => query.trim().length >= 2, [query])

  async function loadUsers() {
    setLoading(true)
    setError(null)
    onBusyChange?.(true)
    try {
      const res = await adminGetUsers({
        query: query.trim() || undefined,
        limit: 50,
        offset: 0,
      })
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось загрузить пользователей'
      setError(msg)
    } finally {
      setLoading(false)
      onBusyChange?.(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadDetails(userId: string) {
    setDetailsLoading(true)
    setError(null)
    try {
      const d = await adminGetUserDetails(userId)
      setDetails(d)
      setSelectedUserId(userId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось загрузить детали пользователя'
      setError(msg)
    } finally {
      setDetailsLoading(false)
    }
  }

  return (
    <div className="admin-section">
      <div className="create-form-row">
        <label htmlFor="admin-users-search">Поиск</label>
        <input
          id="admin-users-search"
          className="create-input"
          value={query}
          placeholder="Имя, username, telegramId"
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="admin-section-actions">
          <button
            type="button"
            className="create-submit"
            disabled={loading || (!canSearch && query.trim().length > 0)}
            onClick={loadUsers}
          >
            {loading ? 'Загрузка…' : 'Обновить'}
          </button>
        </div>
      </div>

      {error && <div className="state state--error">{error}</div>}
      {!error && loading && <div className="state state--muted">Загрузка пользователей…</div>}

      {!loading && !error && (
        <div className="state state--muted">
          Всего: {total}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="state state--muted">Нет пользователей</div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="events-list">
          {items.map((u) => (
            <li key={u.userId} className="event-card">
              <div className="event-header">
                <div className="event-title-row">
                  <h3 className="event-title">{u.name || 'Без имени'}</h3>
                </div>
                <div className="event-meta">
                  <span>Рейтинг: {u.ratingScore}</span>
                  <span>Создал: {u.createdEvents}</span>
                  <span>Посетил: {u.attendedEvents}</span>
                  <span>Интерес: {u.interestScore}</span>
                </div>
              </div>

              <div className="admin-section-actions">
                <button
                  type="button"
                  className={`event-action event-action--primary`}
                  onClick={() => loadDetails(u.userId)}
                  disabled={detailsLoading}
                >
                  {selectedUserId === u.userId ? 'Обновить детали' : 'Детали'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {details && (
        <section className="create-card">
          <h2 className="create-card-title">Детали</h2>
          {detailsLoading && <div className="state state--muted">Загрузка деталей…</div>}
          {!detailsLoading && (
            <div className="state state--muted">
              <div>Имя: {details.name}</div>
              <div>Username: {details.username || '-'}</div>
              <div>TelegramId: {details.telegramId || '-'}</div>
              <div>Создал: {details.createdEvents}</div>
              <div>Посетил: {details.attendedEvents}</div>
              <div>Интерес: {details.interestScore}</div>
              <div>Итоговый рейтинг: {details.ratingScore}</div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

