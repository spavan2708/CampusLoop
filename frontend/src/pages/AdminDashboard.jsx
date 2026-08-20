import { Search, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import { getAdminClubs, getAdminEvents, moderateEvent, setClubActive, toggleFeatured } from '../services/admin.js'
import { getApiErrorMessage } from '../services/errors.js'
import { formatDateTime } from '../utils/events.js'

export default function AdminDashboard() {
  const [clubs, setClubs] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  async function refresh() {
    setError('')
    try { const [clubItems, eventItems] = await Promise.all([getAdminClubs(), getAdminEvents()]); setClubs(clubItems); setEvents(eventItems.items) }
    catch (requestError) { setError(getApiErrorMessage(requestError, 'Could not load administration data.')) }
    finally { setLoading(false) }
  }
  useEffect(() => { Promise.resolve().then(refresh) }, [])
  const filteredEvents = useMemo(() => events.filter((event) => (status === 'all' || event.status === status) && `${event.title} ${event.organizer_name} ${event.category}`.toLowerCase().includes(search.trim().toLowerCase())), [events, search, status])
  async function confirmAction(reason) {
    const current = dialog; setBusy(true); setMessage(null)
    try {
      if (current.kind === 'club') await setClubActive(current.club.id, !current.club.is_active)
      else if (current.action === 'feature') await toggleFeatured(current.event.id)
      else await moderateEvent(current.event.id, current.action, reason || null)
      setDialog(null); await refresh(); setMessage({ type: 'success', text: 'Administration record updated.' })
    } catch (requestError) { setMessage({ type: 'error', text: getApiErrorMessage(requestError, 'The action could not be completed.') }) }
    finally { setBusy(false) }
  }
  if (loading) return <main className="dashboard-main"><LoadingState message="Loading administration data…" /></main>
  const pending = events.filter((event) => event.status === 'pending_approval').length
  const registrations = events.reduce((total, event) => total + event.registered_count, 0)
  return <><main className="dashboard-main admin-page">
    <div className="page-heading-row"><div className="page-heading"><span className="dashboard-kicker">Central administration</span><h1>Campus operations</h1><p>Manage club access, review submissions, and protect the quality of the public calendar.</p></div><Link className="button button-primary" to="/admin/clubs/new">Create club login</Link></div>
    <StatusMessage type={error ? 'error' : message?.type}>{error || message?.text}</StatusMessage>
    <section className="stat-grid"><div><UsersRound /><strong>{clubs.length}</strong><span>Clubs</span></div><div><ShieldCheck /><strong>{clubs.filter((club) => club.is_active).length}</strong><span>Active logins</span></div><div><Sparkles /><strong>{pending}</strong><span>Awaiting review</span></div><div><strong>{events.length}</strong><span>Events</span></div><div><strong>{registrations}</strong><span>Registrations</span></div></section>
    <section className="admin-section"><div className="section-title-row"><div><span className="dashboard-kicker">Access control</span><h2>Club accounts</h2></div><Link className="text-link" to="/admin/clubs/new">Add club →</Link></div>{clubs.length ? <div className="admin-table">{clubs.map((club) => <article key={club.id}><div><strong>{club.name}</strong><span>{club.category} · {club.contact_email}</span><StatusBadge value={club.is_active ? 'active' : 'inactive'} /></div><button className={club.is_active ? 'button button-danger button-small' : 'button button-secondary button-small'} onClick={() => setDialog({ kind: 'club', club })}>{club.is_active ? 'Deactivate login' : 'Reactivate login'}</button></article>)}</div> : <EmptyState title="No club accounts" message="Create the first club login to begin." />}</section>
    <section className="admin-section"><div className="section-title-row"><div><span className="dashboard-kicker">Moderation queue</span><h2>Event submissions</h2></div><label className="search-field"><Search /><span className="sr-only">Search events</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events or clubs" /></label></div><div className="status-tabs">{['all', 'pending_approval', 'approved', 'published', 'changes_requested', 'rejected', 'cancelled'].map((item) => <button className={status === item ? 'active' : ''} onClick={() => setStatus(item)} key={item}>{item.replaceAll('_', ' ')}</button>)}</div>{filteredEvents.length ? <div className="admin-table">{filteredEvents.map((event) => <article key={event.id}><div><div className="row-inline"><strong>{event.title}</strong><StatusBadge value={event.status} />{event.is_featured && <StatusBadge value="featured" />}</div><span>{event.organizer_name} · {event.category} · {formatDateTime(event.event_date)}</span><p>{event.description}</p></div><div className="table-actions">{event.status === 'pending_approval' && <><button className="button button-primary button-small" onClick={() => setDialog({ event, action: 'approve' })}>Approve</button><button className="button button-secondary button-small" onClick={() => setDialog({ event, action: 'request-changes' })}>Request changes</button><button className="button button-danger button-small" onClick={() => setDialog({ event, action: 'reject' })}>Reject</button></>}{event.status === 'approved' && <button className="button button-primary button-small" onClick={() => setDialog({ event, action: 'publish' })}>Publish</button>}{event.status === 'published' && <><button className="button button-secondary button-small" onClick={() => setDialog({ event, action: 'feature' })}>{event.is_featured ? 'Unfeature' : 'Feature'}</button><button className="button button-danger button-small" onClick={() => setDialog({ event, action: 'cancel' })}>Cancel</button></>}</div></article>)}</div> : <EmptyState title="No matching events" message="Change the status filter or search query." />}</section>
  </main><ConfirmDialog open={Boolean(dialog)} title={dialog?.kind === 'club' ? `${dialog.club.is_active ? 'Deactivate' : 'Reactivate'} club login?` : `${dialog?.action?.replace('-', ' ') || ''} event?`} description={dialog?.kind === 'club' ? 'This changes the club login and its ability to manage events.' : 'This moderation decision is recorded and immediately affects the event workflow.'} reasonLabel={['reject', 'request-changes', 'cancel'].includes(dialog?.action) ? 'Reason (required)' : null} confirmLabel="Confirm action" tone={['reject', 'cancel'].includes(dialog?.action) || (dialog?.kind === 'club' && dialog.club.is_active) ? 'danger' : 'primary'} busy={busy} onCancel={() => setDialog(null)} onConfirm={confirmAction} /></>
}
