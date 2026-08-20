import { ArrowLeft, CalendarDays, Clock3, Edit3, MapPin, Send, UserRoundSearch, Users, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import useOrganizerData from '../context/useOrganizerData.js'
import { getApiErrorMessage } from '../services/errors.js'
import { formatDateTime } from '../utils/events.js'

export default function OrganizerEventDetailsPage() {
  const { eventId } = useParams()
  const location = useLocation()
  const { events, loading, publish, cancel } = useOrganizerData()
  const [busy, setBusy] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [message, setMessage] = useState(location.state?.message ? { type: 'success', text: location.state.message } : null)
  const event = events.find((item) => item.id === Number(eventId))
  async function runAction() {
    const action = pendingAction; setPendingAction(null); setBusy(true); setMessage(null)
    try { await (action === 'publish' ? publish(event.id) : cancel(event.id)); setMessage({ type: 'success', text: action === 'publish' ? 'Event submitted for central approval.' : 'Event cancelled.' }) }
    catch (requestError) { setMessage({ type: 'error', text: getApiErrorMessage(requestError, `Could not ${action} event.`) }) }
    finally { setBusy(false) }
  }
  if (loading) return <main className="dashboard-main"><LoadingState message="Loading event…" /></main>
  if (!event) return <main className="dashboard-main"><EmptyState title="Event not found" message="This event does not belong to your club account." actionLabel="Manage events" actionTo="/club/events" /></main>
  const editable = ['draft', 'rejected', 'changes_requested'].includes(event.status)
  return <><main className="dashboard-main"><Link className="back-link" to="/club/events"><ArrowLeft /> Manage events</Link><StatusMessage type={message?.type}>{message?.text}</StatusMessage><article className="event-detail-card"><div className="event-detail-hero"><div><span className="category-pill">{event.category}</span><h1>{event.title}</h1><p>{event.description}</p></div><StatusBadge value={event.status} /></div><div className="detail-grid"><div><CalendarDays /><span>Event date</span><strong>{formatDateTime(event.event_date)}</strong></div><div><Clock3 /><span>Registration deadline</span><strong>{formatDateTime(event.registration_deadline)}</strong></div><div><MapPin /><span>Venue</span><strong>{event.venue}</strong></div><div><Users /><span>Registrations</span><strong>{event.registered_count} of {event.capacity}</strong></div><div><Users /><span>Waitlist</span><strong>{event.waitlist_count}</strong></div><div><Clock3 /><span>Created</span><strong>{formatDateTime(event.created_at)}</strong></div></div><div className="organizer-detail-actions">{editable && <Link className="button button-secondary" to={`/club/events/${event.id}/edit`}><Edit3 /> Edit</Link>}{editable && <button className="button button-primary" disabled={busy} type="button" onClick={() => setPendingAction('publish')}><Send /> Submit for approval</button>}{event.status !== 'cancelled' && <button className="button button-danger" disabled={busy} type="button" onClick={() => setPendingAction('cancel')}><XCircle /> Cancel event</button>}<Link className="button button-secondary" to={`/club/events/${event.id}/attendees`}><UserRoundSearch /> View attendees</Link></div></article></main><ConfirmDialog open={Boolean(pendingAction)} title={pendingAction === 'publish' ? 'Submit event for approval?' : 'Cancel this event?'} description={pendingAction === 'publish' ? 'You cannot edit the event while it is being reviewed.' : 'Cancellation removes it from student discovery and cannot be undone.'} confirmLabel={pendingAction === 'publish' ? 'Submit for approval' : 'Cancel event'} tone={pendingAction === 'publish' ? 'primary' : 'danger'} busy={busy} onCancel={() => setPendingAction(null)} onConfirm={runAction} /></>
}
