import { useEffect, useState } from 'react'
import type { AdminReminderRow } from '../../api/admin'
import {
  adminGetReminders,
  adminResetReminder,
  adminSendReminderNow,
} from '../../api/admin'

export default function AdminReminders() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<AdminReminderRow[]>([])
  const [busyById, setBusyById] = useState<Record<string, boolean>>({})

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await adminGetReminders({ sent: false })
      setItems(res.items)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось загрузить напоминания'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function sendNow(reminderId: string) {
    setBusyById((m) => ({ ...m, [reminderId]: true }))
    setError(null)
    try {
      await adminSendReminderNow(reminderId)
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось отправить напоминание'
      setError(msg)
    } finally {
      setBusyById((m) => ({ ...m, [reminderId]: false }))
    }
  }

  async function reset(reminderId: string) {
    setBusyById((m) => ({ ...m, [reminderId]: true }))
    setError(null)
    try {
      await adminResetReminder(reminderId)
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось сбросить напоминание'
      setError(msg)
    } finally {
      setBusyById((m) => ({ ...m, [reminderId]: false }))
    }
  }

  return (
    <div className="admin-section">
      {error && <div className="state state--error">{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="create-submit" disabled={loading} onClick={load}>
          {loading ? 'Загрузка…' : 'Обновить'}
        </button>
      </div>

      {loading && <div className="state state--muted">Загрузка напоминаний…</div>}

      {!loading && !error && items.length === 0 && (
        <div className="state state--muted">Нет активных (sent=false) напоминаний</div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="events-list">
          {items.map((r) => {
            const isBusy = !!busyById[r._id]
            return (
              <li key={r._id} className="event-card">
                <div className="event-header">
                  <div className="event-title-row">
                    <h3 className="event-title">
                      {r.eventId?.title || 'Без названия'} ({r.type})
                    </h3>
                  </div>
                  <div className="event-meta">
                    <span>Кому: {r.userId?.name || '-'}</span>
                    <span>
                      Когда: {r.remindAt ? new Date(r.remindAt).toLocaleString('ru') : '-'}
                    </span>
                    <span>Sent: {String(r.sent)}</span>
                  </div>
                </div>

                <div className="admin-section-actions">
                  <button
                    type="button"
                    className="event-action event-action--primary"
                    disabled={isBusy}
                    onClick={() => sendNow(r._id)}
                  >
                    Отправить сейчас
                  </button>
                  <button
                    type="button"
                    className="event-action event-action--secondary"
                    disabled={isBusy}
                    onClick={() => reset(r._id)}
                  >
                    Сбросить
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

