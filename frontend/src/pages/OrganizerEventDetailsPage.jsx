import { ArrowLeft, CalendarDays, Clock3, Edit3, MapPin, Send, UserRoundSearch, Users, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import useOrganizerData from '../context/useOrganizerData.js'
import { getApiErrorMessage } from '../services/errors.js'
import { formatDateTime } from '../utils/events.js'

function OrganizerEventDetailsPage() {
  const { eventId } = useParams()
  const location = useLocation()
  const { events, loading, publish, cancel } = useOrganizerData()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(location.state?.message ? { type: 'success', text: location.state.message } : null)
  const event = events.find((item) => item.id === Number(eventId))
  async function runAction(action) {
    const publishing = action === 'publish'
    const prompt = publishing ? `Publish “${event.title}”? Students will be able to register.` : `Cancel “${event.title}”? Cancellation hides the event and cannot be undone; use draft if you simply are not ready to publish.`
    if (!window.confirm(prompt)) return
    setBusy(true); setMessage(null)
    try { await (publishing ? publish(event.id) : cancel(event.id)); setMessage({ type: 'success', text: publishing ? 'Event published successfully.' : 'Event cancelled.' }) } catch (requestError) { setMessage({ type: 'error', text: getApiErrorMessage(requestError, `Could not ${action} event.`) }) } finally { setBusy(false) }
  }
  if (loading) return <main className="dashboard-main"><LoadingState message="Loading event…" /></main>
  if (!event) return <main className="dashboard-main"><EmptyState title="Event not found" message="This event does not belong to your organizer account." actionLabel="Manage events" actionTo="/organizer/events" /></main>
  return <main className="dashboard-main student-page"><Link className="back-link" to="/organizer/events"><ArrowLeft /> Manage events</Link><StatusMessage type={message?.type}>{message?.text}</StatusMessage><article className="event-detail-card"><div className="event-detail-hero"><div><span className="category-pill">{event.category}</span><h1>{event.title}</h1><p>{event.description}</p></div><span className={`event-status organizer-status-${event.status}`}>{event.status}</span></div><div className="detail-grid"><div><CalendarDays /><span>Event date</span><strong>{formatDateTime(event.event_date)}</strong></div><div><Clock3 /><span>Registration deadline</span><strong>{formatDateTime(event.registration_deadline)}</strong></div><div><MapPin /><span>Venue</span><strong>{event.venue}</strong></div><div><Users /><span>Registrations</span><strong>{event.registered_count} of {event.capacity}</strong></div><div><Users /><span>Available spots</span><strong>{Math.max(0, event.capacity - event.registered_count)}</strong></div><div><Clock3 /><span>Created</span><strong>{formatDateTime(event.created_at)}</strong></div></div><div className="organizer-detail-actions">{event.status !== 'cancelled' && <Link className="button button-secondary" to={`/organizer/events/${event.id}/edit`}><Edit3 /> Edit</Link>}{event.status === 'draft' && <button className="button button-primary" disabled={busy} type="button" onClick={() => runAction('publish')}><Send /> Publish</button>}{event.status !== 'cancelled' && <button className="button button-danger" disabled={busy} type="button" onClick={() => runAction('cancel')}><XCircle /> Cancel event</button>}<Link className="button button-secondary" to={`/organizer/events/${event.id}/attendees`}><UserRoundSearch /> View attendees</Link></div></article></main>
}

export default OrganizerEventDetailsPage
