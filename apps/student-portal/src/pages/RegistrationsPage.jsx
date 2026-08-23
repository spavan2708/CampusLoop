import { CreditCard, Hourglass, ReceiptIndianRupee } from 'lucide-react'
import { useState } from 'react'
import ConfirmDialog from '../../../../frontend/src/components/ConfirmDialog.jsx'
import EmptyState from '../../../../frontend/src/components/EmptyState.jsx'
import ErrorState from '../../../../frontend/src/components/ErrorState.jsx'
import EventCard from '../../../../frontend/src/components/EventCard.jsx'
import LoadingState from '../../../../frontend/src/components/LoadingState.jsx'
import StatusMessage from '../../../../frontend/src/components/StatusMessage.jsx'
import useStudentData from '../../../../frontend/src/context/useStudentData.js'
import { getApiErrorMessage } from '../../../../frontend/src/services/errors.js'
import { isPast } from '../../../../frontend/src/utils/events.js'
import { formatMoney } from '@campusloop/shared-utils'

const labels = { confirmed: 'Confirmed', pending_payment: 'Pay later', waitlisted: 'Waitlisted', cancelled: 'Cancelled' }

function RegistrationMeta({ registration }) {
  const paid = registration.payment_status === 'paid'
  const payLater = registration.status === 'pending_payment' || registration.payment_status === 'pending'
  return <div className="registration-meta" aria-label="Registration status">
    <span className={`registration-state state-${registration.status}`}><Hourglass />{labels[registration.status] || registration.status.replace('_', ' ')}</span>
    {registration.amount_paise > 0 && <span><ReceiptIndianRupee />{formatMoney(registration.amount_paise, registration.currency || 'INR')}</span>}
    {registration.amount_paise > 0 && <span className={paid ? 'payment-paid' : 'payment-pending'}><CreditCard />{paid ? 'Payment received' : payLater ? 'Payment pending — pay later' : registration.payment_status.replace('_', ' ')}</span>}
  </div>
}

function Group({ title, items, cancellingId, onCancel }) {
  if (!items.length) return null
  return <section className="registration-group"><div className="section-title-row"><h2>{title}</h2><span>{items.length} {items.length === 1 ? 'event' : 'events'}</span></div><div className="registration-list">{items.map((item) => <article className="registration-item portal-registration" key={item.id}><div><EventCard event={item.event} registered /><RegistrationMeta registration={item} /></div><button className="button button-danger button-small" type="button" disabled={cancellingId === item.event.id || isPast(item.event.event_date) || item.event.status === 'completed' || item.status === 'cancelled'} onClick={() => onCancel(item.event)}>{cancellingId === item.event.id ? 'Cancelling…' : 'Cancel registration'}</button></article>)}</div></section>
}

export default function RegistrationsPage() {
  const { registrations, loading, error, refresh, cancel } = useStudentData()
  const [cancellingId, setCancellingId] = useState(null)
  const [message, setMessage] = useState(null)
  const [pendingCancel, setPendingCancel] = useState(null)
  const upcoming = registrations.filter((item) => !isPast(item.event.event_date) && item.event.status !== 'completed' && item.event.status !== 'cancelled' && item.status !== 'cancelled')
  const past = registrations.filter((item) => isPast(item.event.event_date) || item.event.status === 'completed' || item.event.status === 'cancelled' || item.status === 'cancelled')

  async function confirmCancel() {
    const event = pendingCancel
    setPendingCancel(null); setCancellingId(event.id); setMessage(null)
    try { await cancel(event.id); setMessage({ type: 'success', text: `Registration for “${event.title}” cancelled.` }) }
    catch (requestError) { setMessage({ type: 'error', text: getApiErrorMessage(requestError, 'Could not cancel registration.') }) }
    finally { setCancellingId(null) }
  }

  return <><main className="dashboard-main"><div className="page-heading"><span className="dashboard-kicker">Your schedule</span><h1>My registrations</h1><p>Confirmed places, waitlists, and pay-later status in one view.</p></div><StatusMessage type={message?.type}>{message?.text}</StatusMessage>{loading ? <LoadingState message="Loading your registrations…" /> : error ? <ErrorState message={getApiErrorMessage(error, 'Could not load your registrations.')} onRetry={refresh} /> : registrations.length ? <><Group title="Upcoming" items={upcoming} cancellingId={cancellingId} onCancel={setPendingCancel} /><Group title="Past or cancelled" items={past} cancellingId={cancellingId} onCancel={setPendingCancel} /></> : <EmptyState title="No registrations yet" message="Explore published events and reserve your first spot." actionLabel="Explore events" actionTo="/events" />}</main><ConfirmDialog open={Boolean(pendingCancel)} title="Cancel your registration?" description={`Your place at “${pendingCancel?.title || ''}” will be released. Any payment handling remains subject to the event organizer’s policy.`} confirmLabel="Cancel registration" busy={Boolean(cancellingId)} onCancel={() => setPendingCancel(null)} onConfirm={confirmCancel} /></>
}
