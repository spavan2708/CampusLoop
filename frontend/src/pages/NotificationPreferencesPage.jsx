import { Bell, Mail, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import useToast from '../context/useToast.js'
import { getNotificationPreferences, updateNotificationPreferences } from '../services/notifications.js'

const categoryLabels = {
  registrations: 'Registration status and reminders', saved_events: 'Saved-event reminders', event_updates: 'Event updates',
  event_reminders: 'Event-start reminders', payments: 'Payment information', discovery: 'Featured events', moderation: 'Moderation updates', operations: 'Operational reminders', club_activity: 'Club-account activity',
}

export default function NotificationPreferencesPage() {
  const [form, setForm] = useState(null); const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const { showToast } = useToast()
  useEffect(() => { getNotificationPreferences().then(setForm).catch(() => setError('Preferences could not be loaded.')) }, [])
  if (error) return <main className="dashboard-main"><div className="notification-empty"><h2>{error}</h2></div></main>
  if (!form) return <main className="dashboard-main"><div className="notification-empty"><h2>Loading preferences…</h2></div></main>
  async function submit(event) { event.preventDefault(); setSaving(true); try { setForm(await updateNotificationPreferences(form)); showToast('Notification preferences saved.', 'success') } catch { showToast('Preferences could not be saved.', 'error') } finally { setSaving(false) } }
  const toggleCategory = (key) => setForm((value) => ({ ...value, category_settings: { ...value.category_settings, [key]: value.category_settings[key] === false } }))
  return <main className="dashboard-main preferences-page"><div className="page-heading"><span className="dashboard-kicker">Your controls</span><h1>Notification preferences</h1><p>Choose useful reminders without losing essential service updates.</p></div>
    <form className="preferences-card" onSubmit={submit}>
      <section><h2>Delivery</h2><label className="preference-row"><Bell /><span><strong>In-app notifications</strong><small>Show notifications inside CampusLoop.</small></span><input type="checkbox" checked={form.in_app_enabled} onChange={(e) => setForm({ ...form, in_app_enabled: e.target.checked })} /></label><label className="preference-row is-disabled"><Mail /><span><strong>Email notifications</strong><small>Prepared for a future configured email provider.</small></span><input type="checkbox" disabled /></label><label className="preference-row is-disabled"><Smartphone /><span><strong>Push notifications</strong><small>Not enabled; browser permission will never be requested automatically.</small></span><input type="checkbox" disabled /></label></section>
      <section><h2>Topics</h2>{Object.entries(categoryLabels).map(([key, label]) => <label className="preference-row" key={key}><span><strong>{label}</strong><small>{['registrations','event_updates'].includes(key) ? 'Essential status changes may still be delivered.' : 'You can turn off this category.'}</small></span><input type="checkbox" checked={form.category_settings[key] !== false} onChange={() => toggleCategory(key)} /></label>)}</section>
      <section className="preferences-grid"><label>Digest frequency<select value={form.digest_frequency} onChange={(e) => setForm({ ...form, digest_frequency: e.target.value })}><option value="instant">Instant</option><option value="daily">Daily digest</option><option value="weekly">Weekly digest</option></select></label><label>Timezone<input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></label><label>Quiet hours start<input type="time" value={form.quiet_hours_start || ''} onChange={(e) => setForm({ ...form, quiet_hours_start: e.target.value || null })} /></label><label>Quiet hours end<input type="time" value={form.quiet_hours_end || ''} onChange={(e) => setForm({ ...form, quiet_hours_end: e.target.value || null })} /></label></section>
      <button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</button>
    </form></main>
}
