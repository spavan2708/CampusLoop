import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import OrganizerEventCard from '../components/OrganizerEventCard.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import useOrganizerData from '../context/useOrganizerData.js'
import { getApiErrorMessage } from '../services/errors.js'

function ManageEventsPage() {
  const { events, loading, error, refresh, publish, cancel } = useOrganizerData()
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState(null)
  const filtered = useMemo(() => events.filter((event) => (status === 'all' || event.status === status) && event.title.toLowerCase().includes(search.trim().toLowerCase())), [events, status, search])

  async function handlePublish(event) {
    if (!window.confirm(`Publish “${event.title}”? Students will be able to discover and register for it.`)) return
    setBusyId(event.id); setMessage(null)
    try { await publish(event.id); setMessage({ type: 'success', text: `“${event.title}” is now published.` }) } catch (requestError) { setMessage({ type: 'error', text: getApiErrorMessage(requestError, 'Could not publish this event.') }) } finally { setBusyId(null) }
  }
  async function handleCancel(event) {
    if (!window.confirm(`Cancel “${event.title}”? This is different from leaving it as a draft: cancellation hides it from discovery and cannot be undone.`)) return
    setBusyId(event.id); setMessage(null)
    try { await cancel(event.id); setMessage({ type: 'success', text: `“${event.title}” was cancelled.` }) } catch (requestError) { setMessage({ type: 'error', text: getApiErrorMessage(requestError, 'Could not cancel this event.') }) } finally { setBusyId(null) }
  }

  return <main className="dashboard-main student-page"><div className="page-heading-row"><div className="page-heading"><span className="dashboard-kicker">Event management</span><h1>Manage events</h1><p>Review, publish, edit, cancel, and monitor your events.</p></div><Link className="button button-primary" to="/organizer/events/new"><Plus /> Create event</Link></div><StatusMessage type={message?.type}>{message?.text}</StatusMessage><div className="manage-toolbar"><label className="search-field"><Search /><span className="sr-only">Search owned events</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your events" /></label><div className="status-tabs" aria-label="Filter by status">{['all', 'draft', 'published', 'cancelled'].map((option) => <button className={status === option ? 'active' : ''} type="button" onClick={() => setStatus(option)} key={option}>{option}</button>)}</div></div>{loading ? <LoadingState message="Loading your events…" /> : error ? <ErrorState message={getApiErrorMessage(error, 'Could not load your events.')} onRetry={refresh} /> : filtered.length ? <div className="organizer-event-list">{filtered.map((event) => <OrganizerEventCard key={event.id} event={event} actionBusy={busyId === event.id} onPublish={handlePublish} onCancel={handleCancel} />)}</div> : <EmptyState title="No matching events" message={events.length ? 'Try another status or search term.' : 'Create your first event and it will appear here.'} actionLabel="Create event" actionTo="/organizer/events/new" />}</main>
}

export default ManageEventsPage
