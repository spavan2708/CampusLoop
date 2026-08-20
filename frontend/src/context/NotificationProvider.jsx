import { useCallback, useEffect, useMemo, useState } from 'react'
import useAuth from './useAuth.js'
import NotificationContext from './notification-context.js'
import { getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead } from '../services/notifications.js'

export default function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try {
      const [list, count] = await Promise.all([getNotifications({ limit: 8 }), getUnreadCount()])
      setItems(list.items); setUnreadCount(count)
    } catch { setError('Notifications could not be loaded.') }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => {
    if (!user) return undefined
    const initial = window.setTimeout(refresh, 0)
    const timer = window.setInterval(refresh, 60000)
    return () => { window.clearTimeout(initial); window.clearInterval(timer) }
  }, [user, refresh])

  const markRead = useCallback(async (id) => {
    const previous = items
    const wasUnread = previous.some((item) => item.id === id && !item.read_at)
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString(), status: 'read' } : item))
    if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1))
    try { await markNotificationRead(id) }
    catch { setItems(previous); if (wasUnread) setUnreadCount((count) => count + 1); throw new Error('Could not mark notification as read.') }
  }, [items])

  const markAllRead = useCallback(async () => {
    const previous = items; const previousCount = unreadCount
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString(), status: 'read' }))); setUnreadCount(0)
    try { await markAllNotificationsRead() }
    catch { setItems(previous); setUnreadCount(previousCount); throw new Error('Could not mark notifications as read.') }
  }, [items, unreadCount])

  const value = useMemo(() => ({ items, unreadCount, loading, error, refresh, markRead, markAllRead }), [items, unreadCount, loading, error, refresh, markRead, markAllRead])
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
