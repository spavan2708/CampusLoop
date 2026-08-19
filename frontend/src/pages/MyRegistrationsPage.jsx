import { useState } from 'react'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import EventCard from '../components/EventCard.jsx'
import LoadingState from '../components/LoadingState.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import useStudentData from '../context/useStudentData.js'
import { getApiErrorMessage } from '../services/errors.js'
import { isPast } from '../utils/events.js'

function RegistrationGroup({ title, items, cancellingId, onCancel }) {
  if (!items.length) return null
  return <section className="registration-group"><div className="section-title-row"><h2>{title}</h2><span>{items.length} {items.length === 1 ? 'event' : 'events'}</span></div><div className="registration-list">{items.map((item) => <div className="registration-item" key={item.id}><EventCard event={item.event} registered /><button className="button button-danger button-small" type="button" disabled={cancellingId === item.event.id || isPast(item.event.event_date)} onClick={() => onCancel(item.event)}>{cancellingId === item.event.id ? 'Cancelling…' : 'Cancel registration'}</button></div>)}</div></section>
}

function MyRegistrationsPage() {
  const { registrations, loading, error, refresh, cancel } = useStudentData()
  const [cancellingId, setCancellingId] = useState(null)
  const [message, setMessage] = useState(null)
  const upcoming = registrations.filter((item) => !isPast(item.event.event_date) && item.event.status !== 'cancelled')
  const pastOrCancelled = registrations.filter((item) => isPast(item.event.event_date) || item.event.status === 'cancelled')

  async function handleCancel(event) {
    if (!window.confirm(`Cancel your registration for “${event.title}”?`)) return
    setCancellingId(event.id); setMessage(null)
    try { await cancel(event.id); setMessage({ type: 'success', text: `Registration for “${event.title}” cancelled.` }) }
    catch (requestError) { setMessage({ type: 'error', text: getApiErrorMessage(requestError, 'Could not cancel registration.') }) }
    finally { setCancellingId(null) }
  }

  return <main className="dashboard-main student-page"><div className="page-heading"><span className="dashboard-kicker">Your schedule</span><h1>My registrations</h1><p>Review your upcoming events and manage your reservations.</p></div><StatusMessage type={message?.type}>{message?.text}</StatusMessage>{loading ? <LoadingState message="Loading your registrations…" /> : error ? <ErrorState message={getApiErrorMessage(error, 'Could not load your registrations.')} onRetry={refresh} /> : registrations.length ? <><RegistrationGroup title="Upcoming" items={upcoming} cancellingId={cancellingId} onCancel={handleCancel} /><RegistrationGroup title="Past or cancelled" items={pastOrCancelled} cancellingId={cancellingId} onCancel={handleCancel} /></> : <EmptyState title="No registrations yet" message="Explore published events and reserve your first spot." actionLabel="Explore events" actionTo="/student/events" />}</main>
}

export default MyRegistrationsPage
