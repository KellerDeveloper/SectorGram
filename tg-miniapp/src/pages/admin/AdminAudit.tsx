import { useEffect, useState } from 'react'
import { adminGetAudit, type AdminAuditLogRow } from '../../api/admin'

export default function AdminAudit() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<AdminAuditLogRow[]>([])
  const [offset, setOffset] = useState(0)

  async function loadMore() {
    setLoading(true)
    setError(null)
    try {
      const res = await adminGetAudit({ limit: 50, offset })
      const next = res.items || []
      setItems((prev) => [...prev, ...next])
      setOffset((o) => o + next.length)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось загрузить журнал'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setItems([])
    setOffset(0)
    loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="admin-section">
      {error && <div className="state state--error">{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="create-submit" disabled={loading} onClick={loadMore}>
          {loading ? 'Загрузка…' : 'Загрузить ещё'}
        </button>
      </div>

      {items.length === 0 && !loading && !error && (
        <div className="state state--muted">Пока нет действий</div>
      )}

      {items.length > 0 && (
        <ul className="events-list">
          {items.map((l) => (
            <li key={l.id} className="event-card">
              <div className="event-header">
                <div className="event-title-row">
                  <h3 className="event-title">{l.action}</h3>
                </div>
                <div className="event-meta">
                  <span>target: {l.targetType}:{l.targetId}</span>
                  <span>{l.createdAt ? new Date(l.createdAt).toLocaleString('ru') : '-'}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

