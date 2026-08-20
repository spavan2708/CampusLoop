import { ArrowLeft, Mail, Search, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { getApiErrorMessage } from '../services/errors.js'
import { getEventAttendees } from '../services/registrations.js'
import { formatDateTime } from '../utils/events.js'

function AttendeesPage() {
  const { eventId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    getEventAttendees(eventId).then((result) => { if (active) setData(result) }).catch((requestError) => { if (active) setError(requestError) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [eventId, retry])
  const attendees = useMemo(() => data?.items.filter((item) => `${item.student.name} ${item.student.email}`.toLowerCase().includes(search.toLowerCase().trim())) ?? [], [data, search])
  function reload() { setLoading(true); setError(''); setRetry((value) => value + 1) }
  if (loading) return <main className="dashboard-main"><LoadingState message="Loading attendees…" /></main>
  if (error) return <main className="dashboard-main"><ErrorState message={getApiErrorMessage(error, 'Could not load attendees.')} onRetry={reload} /></main>
  return <main className="dashboard-main student-page"><Link className="back-link" to={`/club/events/${eventId}`}><ArrowLeft /> Back to event</Link><div className="page-heading-row"><div className="page-heading"><span className="dashboard-kicker">Attendee management</span><h1>{data.event.title}</h1><p>{data.total} of {data.event.capacity} spots registered.</p></div>{data.total > 0 && <label className="attendee-search search-field"><Search /><span className="sr-only">Search attendees</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" /></label>}</div>{data.total === 0 ? <EmptyState title="No attendees yet" message="Registered students will appear here after this event is published." /> : attendees.length ? <div className="attendee-table" role="table" aria-label="Event attendees"><div className="attendee-row attendee-heading" role="row"><span>Student</span><span>Email</span><span>Registered</span></div>{attendees.map((item) => <div className="attendee-row" role="row" key={item.registration_id}><span><UserRound />{item.student.name}</span><span><Mail />{item.student.email}</span><span>{formatDateTime(item.registered_at)}</span></div>)}</div> : <EmptyState title="No matching attendees" message="Try a different name or email address." />}</main>
}

export default AttendeesPage
