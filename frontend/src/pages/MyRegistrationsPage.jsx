import { useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import EventCard from '../components/EventCard.jsx'
import LoadingState from '../components/LoadingState.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import useStudentData from '../context/useStudentData.js'
import { getApiErrorMessage } from '../services/errors.js'
import { isPast } from '../utils/events.js'

function Group({ title, items, cancellingId, onCancel }) {
  if (!items.length) return null
  return <section className="registration-group"><div className="section-title-row"><h2>{title}</h2><span>{items.length} {items.length === 1 ? 'event' : 'events'}</span></div><div className="registration-list">{items.map((item) => <div className="registration-item" key={item.id}><EventCard event={item.event} registered /><button className="button button-danger button-small" type="button" disabled={cancellingId === item.event.id || isPast(item.event.event_date)} onClick={() => onCancel(item.event)}>{cancellingId === item.event.id ? 'Cancelling…' : 'Cancel registration'}</button></div>)}</div></section>
}

export default function MyRegistrationsPage() {
  const { registrations, loading, error, refresh, cancel } = useStudentData()
  const [cancellingId, setCancellingId] = useState(null)
  const [message, setMessage] = useState(null)
  const [pendingCancel, setPendingCancel] = useState(null)
  const upcoming = registrations.filter((item) => !isPast(item.event.event_date) && item.event.status !== 'cancelled')
  const past = registrations.filter((item) => isPast(item.event.event_date) || item.event.status === 'cancelled')
  async function confirmCancel() {
    const event = pendingCancel
    setPendingCancel(null); setCancellingId(event.id); setMessage(null)
    try { await cancel(event.id); setMessage({ type: 'success', text: `Registration for “${event.title}” cancelled.` }) }
    catch (requestError) { setMessage({ type: 'error', text: getApiErrorMessage(requestError, 'Could not cancel registration.') }) }
    finally { setCancellingId(null) }
  }
  return <><main className="dashboard-main"><div className="page-heading"><span className="dashboard-kicker">Your schedule</span><h1>My registrations</h1><p>Everything you have signed up for, in one place.</p></div><StatusMessage type={message?.type}>{message?.text}</StatusMessage>{loading ? <LoadingState message="Loading your registrations…" /> : error ? <ErrorState message={getApiErrorMessage(error, 'Could not load your registrations.')} onRetry={refresh} /> : registrations.length ? <><Group title="Upcoming" items={upcoming} cancellingId={cancellingId} onCancel={setPendingCancel} /><Group title="Past or cancelled" items={past} cancellingId={cancellingId} onCancel={setPendingCancel} /></> : <EmptyState title="No registrations yet" message="Explore published events and reserve your first spot." actionLabel="Explore events" actionTo="/student/events" />}</main><ConfirmDialog open={Boolean(pendingCancel)} title="Cancel your registration?" description={`Your place at “${pendingCancel?.title || ''}” will be released.`} confirmLabel="Cancel registration" busy={Boolean(cancellingId)} onCancel={() => setPendingCancel(null)} onConfirm={confirmCancel} /></>
}
