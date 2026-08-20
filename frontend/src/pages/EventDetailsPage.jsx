import { ArrowLeft, Bookmark, CalendarDays, Clock3, MapPin, ShieldCheck, UserRound, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import useStudentData from '../context/useStudentData.js'
import { getApiErrorMessage } from '../services/errors.js'
import { getEvent } from '../services/events.js'
import { getSavedEvents, saveEvent, unsaveEvent } from '../services/registrations.js'
import { formatDateTime, getRegistrationState, isPast } from '../utils/events.js'

function EventDetailsPage() {
  const { eventId } = useParams()
  const { registrations, register, cancel } = useStudentData()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [saved, setSaved] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const registration = registrations.find((item) => item.event.id === Number(eventId))

  useEffect(() => {
    let active = true
    Promise.all([getEvent(eventId), getSavedEvents()]).then(([data, savedEvents]) => { if (active) { setEvent(data); setSaved(savedEvents.some((item) => item.id === Number(eventId))) } }).catch((error) => { if (active) setMessage({ type: 'error', text: getApiErrorMessage(error, 'Could not load this event.') }) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [eventId])

  async function handleRegister() {
    if (actionLoading) return
    setActionLoading(true); setMessage(null)
    try { const result = await register(event.id); setEvent(result.event); const copy = result.status === 'waitlisted' ? 'You joined the waitlist.' : result.status === 'pending_payment' ? 'Your place is pending payment. Online payment is not enabled yet.' : 'You’re registered for this event.'; setMessage({ type: 'success', text: copy }) }
    catch (error) { setMessage({ type: 'error', text: getApiErrorMessage(error, 'Registration failed.') }) }
    finally { setActionLoading(false) }
  }

  async function toggleSaved() {
    if (actionLoading) return
    setActionLoading(true); setMessage(null)
    try { await (saved ? unsaveEvent(event.id) : saveEvent(event.id)); setSaved(!saved); setMessage({ type: 'success', text: saved ? 'Event removed from saved events.' : 'Event saved.' }) }
    catch (error) { setMessage({ type: 'error', text: getApiErrorMessage(error, 'Could not update saved events.') }) }
    finally { setActionLoading(false) }
  }

  async function handleCancel() {
    setCancelOpen(false)
    setActionLoading(true); setMessage(null)
    try { await cancel(event.id); setEvent((current) => ({ ...current, registered_count: Math.max(0, current.registered_count - 1) })); setMessage({ type: 'success', text: 'Your registration was cancelled.' }) }
    catch (error) { setMessage({ type: 'error', text: getApiErrorMessage(error, 'Cancellation failed.') }) }
    finally { setActionLoading(false) }
  }

  if (loading) return <main className="dashboard-main"><LoadingState message="Loading event details…" /></main>
  if (!event) return <main className="dashboard-main"><ErrorState message={message?.text || 'Event not found.'} /></main>
  const state = getRegistrationState(event)
  const canCancel = registration && !isPast(event.event_date)
  return (
    <><main className="dashboard-main student-page">
      <Link className="back-link" to="/student/events"><ArrowLeft size={17} /> Back to events</Link>
      <StatusMessage type={message?.type}>{message?.text}</StatusMessage>
      <article className="event-detail-card">
        <div className="event-detail-hero"><div><span className="category-pill">{event.category}</span><h1>{event.title}</h1><p>{event.description}</p><button className="button button-secondary button-small" type="button" disabled={actionLoading} onClick={toggleSaved}><Bookmark /> {saved ? 'Saved' : 'Save event'}</button></div><span className={`event-status status-${registration ? 'registered' : state.key}`}>{registration ? registration.status.replaceAll('_', ' ') : state.label}</span></div>
        <div className="detail-grid">
          <div><CalendarDays /><span>Event date</span><strong>{formatDateTime(event.event_date)}</strong></div><div><Clock3 /><span>Registration deadline</span><strong>{formatDateTime(event.registration_deadline)}</strong></div><div><MapPin /><span>Venue</span><strong>{event.venue}</strong></div><div><UserRound /><span>Organizer</span><strong>{event.organizer_name}</strong></div><div><Users /><span>Capacity</span><strong>{event.registered_count} registered · {event.capacity} total</strong></div><div><ShieldCheck /><span>Availability</span><strong>{Math.max(0, event.capacity - event.registered_count)} spots remaining</strong></div>
        </div>
        <div className="detail-action"><div><h2>{registration ? 'Registration status saved' : state.label}</h2><p>{registration ? 'You can find this event in My Registrations.' : state.key === 'open' ? 'Register now to reserve your place.' : state.key === 'full' ? 'Join the waitlist and CampusLoop will track your place.' : 'This event is not accepting registrations.'}</p></div>{registration ? <button className="button button-danger" type="button" disabled={actionLoading || !canCancel} onClick={() => setCancelOpen(true)}>{actionLoading ? 'Cancelling…' : 'Cancel registration'}</button> : <button className="button button-primary" type="button" disabled={actionLoading || state.key === 'closed'} onClick={handleRegister}>{actionLoading ? 'Submitting…' : state.key === 'full' ? 'Join waitlist' : event.is_paid ? `Continue for ₹${(event.entry_fee_paise / 100).toFixed(0)}` : 'Register now'}</button>}</div>
      </article>
    </main><ConfirmDialog open={cancelOpen} title="Cancel your registration?" description="Your place will be released and may be offered to a waitlisted student." confirmLabel="Cancel registration" busy={actionLoading} onCancel={() => setCancelOpen(false)} onConfirm={handleCancel} /></>
  )
}

export default EventDetailsPage
