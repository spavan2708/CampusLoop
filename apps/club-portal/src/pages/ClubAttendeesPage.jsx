import { ArrowLeft, BadgeIndianRupee, Mail, Search, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EmptyState from '../../../../frontend/src/components/EmptyState.jsx'
import ErrorState from '../../../../frontend/src/components/ErrorState.jsx'
import LoadingState from '../../../../frontend/src/components/LoadingState.jsx'
import { getApiErrorMessage } from '../../../../frontend/src/services/errors.js'
import { getEventAttendees } from '../../../../frontend/src/services/registrations.js'
import { formatDateTime } from '../../../../frontend/src/utils/events.js'

export default function ClubAttendeesPage() {
  const { eventId } = useParams()
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [search, setSearch] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => { let active = true; getEventAttendees(eventId).then((result) => active && setData(result)).catch((requestError) => active && setError(requestError)).finally(() => active && setLoading(false)); return () => { active = false } }, [eventId, retry])
  const attendees = useMemo(() => data?.items.filter((item) => `${item.student.name} ${item.student.email} ${item.status} ${item.payment_status}`.toLowerCase().includes(search.toLowerCase().trim())) ?? [], [data, search])
  if (loading) return <main className="dashboard-main"><LoadingState message="Loading attendees…" /></main>
  if (error) return <main className="dashboard-main"><ErrorState message={getApiErrorMessage(error, 'Could not load attendees.')} onRetry={() => { setLoading(true); setError(''); setRetry((value) => value + 1) }} /></main>
  const paid = data.items.filter((item) => item.payment_status === 'paid').length
  const pending = data.items.filter((item) => item.payment_status === 'pending').length
  const expected = data.items.reduce((total, item) => total + (item.amount_paise || 0), 0)
  return <main className="dashboard-main student-page"><Link className="back-link" to={`/club/events/${eventId}`}><ArrowLeft /> Back to event</Link><div className="page-heading-row"><div className="page-heading"><span className="dashboard-kicker">Attendee management</span><h1>{data.event.title}</h1><p>{data.total} of {data.event.capacity} spots registered.</p></div>{data.total > 0 && <label className="attendee-search search-field"><Search /><span className="sr-only">Search attendees</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search attendee or status" /></label>}</div><section className="payment-summary" aria-label="Registration and payment summary"><article><UserRound /><strong>{data.total}</strong><span>Registrations</span></article><article><BadgeIndianRupee /><strong>{paid}</strong><span>Paid</span></article><article><BadgeIndianRupee /><strong>{pending}</strong><span>Pay later / pending</span></article><article><BadgeIndianRupee /><strong>₹{(expected / 100).toFixed(2)}</strong><span>Recorded fee value</span></article></section>{data.total === 0 ? <EmptyState title="No attendees yet" message="Registered students will appear here after the event is published." /> : attendees.length ? <div className="attendee-table club-attendee-table" role="table" aria-label="Event attendees"><div className="attendee-row attendee-heading" role="row"><span>Student</span><span>Email</span><span>Registration</span><span>Payment</span><span>Registered</span></div>{attendees.map((item) => <div className="attendee-row" role="row" key={item.registration_id}><span><UserRound />{item.student.name}</span><span><Mail />{item.student.email}</span><span>{item.status.replaceAll('_', ' ')}</span><span>{item.payment_status.replaceAll('_', ' ')}{item.amount_paise ? ` · ₹${(item.amount_paise / 100).toFixed(2)}` : ''}</span><span>{formatDateTime(item.registered_at)}</span></div>)}</div> : <EmptyState title="No matching attendees" message="Try a different name, email or status." />}</main>
}
