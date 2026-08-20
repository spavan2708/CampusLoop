import { Bell, CheckCheck, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import useNotifications from '../context/useNotifications.js'

const relative = (value) => {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second')
  const minutes = Math.round(seconds / 60)
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour')
  return formatter.format(Math.round(hours / 24), 'day')
}

export default function NotificationBell() {
  const { user } = useAuth()
  const { items, unreadCount, loading, error, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const navigate = useNavigate()
  const rootPath = user.role === 'student' ? '/student' : user.role === 'club_admin' ? '/club' : '/admin'

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (event.key === 'Escape') setOpen(false); if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('keydown', close); document.addEventListener('mousedown', close)
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('mousedown', close) }
  }, [open])

  async function openItem(item) {
    if (!item.read_at) await markRead(item.id).catch(() => {})
    setOpen(false)
    if (item.action_url) navigate(item.action_url)
  }

  return <div className="notification-bell" ref={root}>
    <button type="button" className="icon-button notification-trigger" aria-label={`${unreadCount} unread notifications`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <Bell size={19} />{unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <section className="notification-popover" aria-label="Notifications">
      <header><div><strong>Notifications</strong><small>{unreadCount} unread</small></div><button type="button" onClick={() => markAllRead().catch(() => {})} disabled={!unreadCount}><CheckCheck /> Mark all read</button></header>
      <div className="notification-preview" aria-live="polite">
        {loading && !items.length && <p>Loading notifications…</p>}
        {error && !items.length && <p>{error}</p>}
        {!loading && !items.length && <p>You’re all caught up.</p>}
        {items.slice(0, 6).map((item) => <button key={item.id} type="button" className={item.read_at ? '' : 'is-unread'} onClick={() => openItem(item)}>
          <span className={`notification-dot priority-${item.priority}`} />
          <span><strong>{item.title}</strong><small>{item.message}</small><time title={new Date(item.created_at).toLocaleString()}>{relative(item.created_at)}</time></span>
          <ChevronRight />
        </button>)}
      </div>
      <footer><Link to={`${rootPath}/notifications`} onClick={() => setOpen(false)}>View all notifications</Link><Link to={`${rootPath}/notifications/preferences`} onClick={() => setOpen(false)}>Preferences</Link></footer>
    </section>}
  </div>
}
