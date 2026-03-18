import { useState } from 'react'
import AdminUsers from './AdminUsers'
import AdminEvents from './AdminEvents'
import AdminReminders from './AdminReminders'
import AdminBroadcast from './AdminBroadcast'
import AdminStats from './AdminStats'
import AdminAudit from './AdminAudit'

type AdminTab = 'users' | 'events' | 'reminders' | 'broadcast' | 'stats' | 'audit'

export default function AdminPanel() {
  const [tab, setTab] = useState<AdminTab>('users')

  return (
    <section className="create-card">
      <h2 className="create-card-title">Админка</h2>

      <div className="app-tabs" style={{ marginTop: 0 }}>
        <button
          type="button"
          className={`filter-button ${tab === 'users' ? 'filter-button--active' : ''}`}
          onClick={() => setTab('users')}
        >
          Пользователи
        </button>
        <button
          type="button"
          className={`filter-button ${tab === 'events' ? 'filter-button--active' : ''}`}
          onClick={() => setTab('events')}
        >
          События
        </button>
        <button
          type="button"
          className={`filter-button ${tab === 'reminders' ? 'filter-button--active' : ''}`}
          onClick={() => setTab('reminders')}
        >
          Напоминания
        </button>
        <button
          type="button"
          className={`filter-button ${tab === 'broadcast' ? 'filter-button--active' : ''}`}
          onClick={() => setTab('broadcast')}
        >
          Рассылки
        </button>
        <button
          type="button"
          className={`filter-button ${tab === 'stats' ? 'filter-button--active' : ''}`}
          onClick={() => setTab('stats')}
        >
          Статистика
        </button>
        <button
          type="button"
          className={`filter-button ${tab === 'audit' ? 'filter-button--active' : ''}`}
          onClick={() => setTab('audit')}
        >
          Журнал
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        {tab === 'users' && <AdminUsers />}
        {tab === 'events' && <AdminEvents />}
        {tab === 'reminders' && <AdminReminders />}
        {tab === 'broadcast' && <AdminBroadcast />}
        {tab === 'stats' && <AdminStats />}
        {tab === 'audit' && <AdminAudit />}
      </div>
    </section>
  )
}

