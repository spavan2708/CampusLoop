import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import OrganizerEventCard from '../components/OrganizerEventCard.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import useOrganizerData from '../context/useOrganizerData.js'
import { getApiErrorMessage } from '../services/errors.js'

export default function ManageEventsPage() {
  const { events, loading, error, refresh, publish, cancel } = useOrganizerData()
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const filtered = useMemo(() => events.filter((event) => (status === 'all' || event.status === status) && event.title.toLowerCase().includes(search.trim().toLowerCase())), [events, status, search])

  async function confirmAction() {
    const { event, action } = confirmation
    setConfirmation(null); setBusyId(event.id); setMessage(null)
    try {
      await (action === 'publish' ? publish(event.id) : cancel(event.id))
      setMessage({ type: 'success', text: action === 'publish' ? `“${event.title}” was submitted for approval.` : `“${event.title}” was cancelled.` })
    } catch (requestError) {
      setMessage({ type: 'error', text: getApiErrorMessage(requestError, `Could not ${action} this event.`) })
    } finally { setBusyId(null) }
  }

  return <>
    <main className="dashboard-main">
      <div className="page-heading-row"><div className="page-heading"><span className="dashboard-kicker">Event management</span><h1>Manage events</h1><p>Move every event from draft to an approved campus experience.</p></div><Link className="button button-primary" to="/club/events/new"><Plus /> Create event</Link></div>
      <StatusMessage type={message?.type}>{message?.text}</StatusMessage>
      <div className="manage-toolbar"><label className="search-field"><Search /><span className="sr-only">Search owned events</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your events" /></label><div className="status-tabs" aria-label="Filter by status">{['all', 'draft', 'pending_approval', 'changes_requested', 'approved', 'rejected', 'published', 'cancelled'].map((option) => <button className={status === option ? 'active' : ''} type="button" onClick={() => setStatus(option)} key={option}>{option.replaceAll('_', ' ')}</button>)}</div></div>
      {loading ? <LoadingState message="Loading your events…" /> : error ? <ErrorState message={getApiErrorMessage(error, 'Could not load your events.')} onRetry={refresh} /> : filtered.length ? <div className="organizer-event-list">{filtered.map((event) => <OrganizerEventCard key={event.id} event={event} actionBusy={busyId === event.id} onPublish={() => setConfirmation({ event, action: 'publish' })} onCancel={() => setConfirmation({ event, action: 'cancel' })} />)}</div> : <EmptyState title="No matching events" message={events.length ? 'Try another status or search term.' : 'Create your first event and it will appear here.'} actionLabel="Create event" actionTo="/club/events/new" />}
    </main>
    <ConfirmDialog open={Boolean(confirmation)} title={confirmation?.action === 'publish' ? 'Submit event for approval?' : 'Cancel this event?'} description={confirmation?.action === 'publish' ? 'The event becomes locked while central administration reviews it.' : 'Cancellation removes it from discovery and is different from leaving a draft.'} confirmLabel={confirmation?.action === 'publish' ? 'Submit for approval' : 'Cancel event'} tone={confirmation?.action === 'publish' ? 'primary' : 'danger'} busy={Boolean(busyId)} onCancel={() => setConfirmation(null)} onConfirm={confirmAction} />
  </>
}
