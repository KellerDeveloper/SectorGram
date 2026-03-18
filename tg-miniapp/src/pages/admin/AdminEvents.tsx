import { useEffect, useMemo, useState } from 'react'
import type { AdminEventRow } from '../../api/admin'
import { adminCancelEvent, adminCompleteEvent, adminListEvents } from '../../api/admin'

type StatusFilter = 'all' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled'

export default function AdminEvents() {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<AdminEventRow[]>([])
  const [busyByEventId, setBusyByEventId] = useState<Record<string, boolean>>({})

  const statusParam = useMemo(() => {
    if (status === 'all') return undefined
    return status
  }, [status])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await adminListEvents({ status: statusParam, limit: 50, offset: 0 })
      setItems(res.items)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось загрузить события'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusParam])

  async function onCancel(eventId: string) {
    setBusyByEventId((m) => ({ ...m, [eventId]: true }))
    setError(null)
    try {
      await adminCancelEvent(eventId)
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось отменить событие'
      setError(msg)
    } finally {
      setBusyByEventId((m) => ({ ...m, [eventId]: false }))
    }
  }

  async function onComplete(eventId: string) {
    setBusyByEventId((m) => ({ ...m, [eventId]: true }))
    setError(null)
    try {
      await adminCompleteEvent(eventId)
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось завершить событие'
      setError(msg)
    } finally {
      setBusyByEventId((m) => ({ ...m, [eventId]: false }))
    }
  }

  return (
    <div className="admin-section">
      <div className="create-form-row">
        <label htmlFor="admin-events-status">Статус</label>
        <select
          id="admin-events-status"
          className="create-input"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          <option value="all">Все</option>
          <option value="scheduled">scheduled</option>
          <option value="ongoing">ongoing</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>

      {error && <div className="state state--error">{error}</div>}
      {loading && <div className="state state--muted">Загрузка событий…</div>}

      {!loading && !error && items.length === 0 && (
        <div className="state state--muted">Событий нет</div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="events-list">
          {items.map((ev) => {
            const evId = ev._id
            const isBusy = !!busyByEventId[evId]

            return (
              <li key={evId} className="event-card">
                <div className="event-header">
                  <div className="event-title-row">
                    <h3 className="event-title">{ev.title}</h3>
                  </div>
                  <div className="event-meta">
                    <span>Статус: {ev.status}</span>
                    <span>{new Date(ev.startsAt).toLocaleString('ru')}</span>
                    <span>{ev.place}</span>
                    <span>Участников: {ev.participants?.length ?? 0}</span>
                    {ev.creatorId?.name && <span>Создатель: {ev.creatorId.name}</span>}
                  </div>
                </div>

                <div className="admin-section-actions">
                  <button
                    type="button"
                    className="event-action event-action--secondary"
                    disabled={isBusy}
                    onClick={() => onCancel(evId)}
                  >
                    Отменить
                  </button>
                  <button
                    type="button"
                    className="event-action event-action--primary"
                    disabled={isBusy}
                    onClick={() => onComplete(evId)}
                  >
                    Завершить
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

