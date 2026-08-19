import { ArrowLeft, CalendarDays, Clock3, MapPin, ShieldCheck, UserRound, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import useStudentData from '../context/useStudentData.js'
import { getApiErrorMessage } from '../services/errors.js'
import { getEvent } from '../services/events.js'
import { formatDateTime, getRegistrationState, isPast } from '../utils/events.js'

function EventDetailsPage() {
  const { eventId } = useParams()
  const { registrations, register, cancel } = useStudentData()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const registration = registrations.find((item) => item.event.id === Number(eventId))

  useEffect(() => {
    let active = true
    getEvent(eventId).then((data) => { if (active) setEvent(data) }).catch((error) => { if (active) setMessage({ type: 'error', text: getApiErrorMessage(error, 'Could not load this event.') }) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [eventId])

  async function handleRegister() {
    if (actionLoading) return
    setActionLoading(true); setMessage(null)
    try { const result = await register(event.id); setEvent(result.event); setMessage({ type: 'success', text: 'You’re registered for this event.' }) }
    catch (error) { setMessage({ type: 'error', text: getApiErrorMessage(error, 'Registration failed.') }) }
    finally { setActionLoading(false) }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel your registration for this event?')) return
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
    <main className="dashboard-main student-page">
      <Link className="back-link" to="/student/events"><ArrowLeft size={17} /> Back to events</Link>
      <StatusMessage type={message?.type}>{message?.text}</StatusMessage>
      <article className="event-detail-card">
        <div className="event-detail-hero"><div><span className="category-pill">{event.category}</span><h1>{event.title}</h1><p>{event.description}</p></div><span className={`event-status status-${registration ? 'registered' : state.key}`}>{registration ? 'You’re registered' : state.label}</span></div>
        <div className="detail-grid">
          <div><CalendarDays /><span>Event date</span><strong>{formatDateTime(event.event_date)}</strong></div><div><Clock3 /><span>Registration deadline</span><strong>{formatDateTime(event.registration_deadline)}</strong></div><div><MapPin /><span>Venue</span><strong>{event.venue}</strong></div><div><UserRound /><span>Organizer</span><strong>{event.organizer_name}</strong></div><div><Users /><span>Capacity</span><strong>{event.registered_count} registered · {event.capacity} total</strong></div><div><ShieldCheck /><span>Availability</span><strong>{Math.max(0, event.capacity - event.registered_count)} spots remaining</strong></div>
        </div>
        <div className="detail-action"><div><h2>{registration ? 'Your place is reserved' : state.label}</h2><p>{registration ? 'You can find this event in My Registrations.' : state.key === 'open' ? 'Register now to reserve your place.' : 'This event is not accepting registrations.'}</p></div>{registration ? <button className="button button-danger" type="button" disabled={actionLoading || !canCancel} onClick={handleCancel}>{actionLoading ? 'Cancelling…' : 'Cancel registration'}</button> : <button className="button button-primary" type="button" disabled={actionLoading || state.key !== 'open'} onClick={handleRegister}>{actionLoading ? 'Registering…' : 'Register now'}</button>}</div>
      </article>
    </main>
  )
}

export default EventDetailsPage
