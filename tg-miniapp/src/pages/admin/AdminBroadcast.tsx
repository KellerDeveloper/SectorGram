import { useState } from 'react'
import type { AdminBroadcastType } from '../../api/admin'
import { adminBroadcast } from '../../api/admin'

export default function AdminBroadcast() {
  const [type, setType] = useState<AdminBroadcastType>('all')
  const [eventId, setEventId] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSend() {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const payload = {
        type,
        message: message.trim(),
        eventId: type === 'event_participants' ? eventId.trim() : undefined,
      }
      const res = await adminBroadcast(payload)
      const recipients = res?.recipients
      setSuccess(
        recipients !== undefined
          ? `Готово. Отправлено: ${recipients}`
          : 'Готово',
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось отправить рассылку'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-section">
      {error && <div className="state state--error">{error}</div>}
      {success && <div className="state state--muted">{success}</div>}

      <div className="create-form-row">
        <label htmlFor="admin-bc-type">Кому отправляем</label>
        <select
          id="admin-bc-type"
          className="create-input"
          value={type}
          onChange={(e) => setType(e.target.value as AdminBroadcastType)}
        >
          <option value="all">Всем пользователям с telegramId</option>
          <option value="event_participants">Участникам мероприятия</option>
        </select>
      </div>

      {type === 'event_participants' && (
        <div className="create-form-row">
          <label htmlFor="admin-bc-eventId">eventId</label>
          <input
            id="admin-bc-eventId"
            className="create-input"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Например: 69a5e6ee5ec..."
          />
        </div>
      )}

      <div className="create-form-row">
        <label htmlFor="admin-bc-message">Текст сообщения</label>
        <textarea
          id="admin-bc-message"
          className="create-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Напиши сообщение, которое отправится в Telegram"
        />
      </div>

      <div className="create-actions">
        <button
          type="button"
          className="create-submit"
          disabled={loading || !message.trim() || (type === 'event_participants' && !eventId.trim())}
          onClick={onSend}
        >
          {loading ? 'Отправляем…' : 'Отправить'}
        </button>
      </div>
    </div>
  )
}

