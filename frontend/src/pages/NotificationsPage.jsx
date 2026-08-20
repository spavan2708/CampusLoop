import { Archive, Bell, CheckCheck, ChevronRight, Inbox } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useNotifications from '../context/useNotifications.js'
import { archiveNotification, getNotifications } from '../services/notifications.js'

const filters = [
  ['all', 'All'], ['unread', 'Unread'], ['registrations', 'Registrations'], ['saved_events', 'Saved events'],
  ['payments', 'Payments'], ['event_updates', 'Event updates'], ['moderation', 'Moderation'], ['operations', 'Operations'],
]

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const { markRead, markAllRead, refresh } = useNotifications()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    const params = { limit: 100 }
    if (filter === 'unread') params.unread = true
    else if (filter !== 'all') params.category = filter
    getNotifications(params).then((data) => active && setItems(data.items)).catch(() => active && setError('Notifications could not be loaded.')).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [filter, reload])

  async function openItem(item) { if (!item.read_at) await markRead(item.id); if (item.action_url) navigate(item.action_url) }
  async function archive(event, id) { event.stopPropagation(); await archiveNotification(id); setItems((current) => current.filter((item) => item.id !== id)); refresh() }

  return <main className="dashboard-main notifications-page">
    <div className="page-heading-row"><div className="page-heading"><span className="dashboard-kicker">Activity centre</span><h1>Notifications</h1><p>Updates and reminders that matter to your CampusLoop account.</p></div><button className="button button-secondary" type="button" onClick={async () => { await markAllRead(); setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() }))) }}><CheckCheck /> Mark all read</button></div>
    <div className="notification-tabs" aria-label="Notification filters">{filters.map(([value, label]) => <button type="button" key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
    {loading && <div className="notification-empty"><Bell /><h2>Loading notifications…</h2></div>}
    {error && <div className="notification-empty"><Inbox /><h2>{error}</h2><button type="button" className="button button-secondary" onClick={() => { setLoading(true); setError(''); setReload((value) => value + 1) }}>Try again</button></div>}
    {!loading && !error && !items.length && <div className="notification-empty"><CheckCheck /><h2>You’re all caught up.</h2><p>Important updates and useful reminders will appear here.</p></div>}
    {!loading && !error && <div className="notification-list">{items.map((item) => <article key={item.id} className={item.read_at ? '' : 'is-unread'} onClick={() => openItem(item)}>
      <div className={`notification-type-icon priority-${item.priority}`}><Bell /></div><div><div className="notification-title"><strong>{item.title}</strong><span>{item.category.replaceAll('_', ' ')}</span></div><p>{item.message}</p><time title={new Date(item.created_at).toLocaleString()}>{new Date(item.created_at).toLocaleString()}</time></div>
      <div className="notification-actions"><button type="button" aria-label="Archive notification" onClick={(event) => archive(event, item.id)}><Archive /></button>{item.action_url && <ChevronRight />}</div>
    </article>)}</div>}
  </main>
}
