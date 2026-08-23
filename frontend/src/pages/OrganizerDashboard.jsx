import { Ban, CalendarCheck2, FileClock, Send, TicketCheck, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import useAuth from '../context/useAuth.js'
import useOrganizerData from '../context/useOrganizerData.js'
import { getApiErrorMessage } from '../services/errors.js'
import { formatDateTime, isPast } from '../utils/events.js'

function OrganizerDashboard() {
  const { user } = useAuth()
  const { events, loading, error, refresh } = useOrganizerData()
  const count = (status) => events.filter((event) => event.status === status).length
  const totalRegistrations = events.reduce((total, event) => total + event.registered_count, 0)
  const totalWaitlist = events.reduce((total, event) => total + event.waitlist_count, 0)
  const upcoming = events.filter((event) => !isPast(event.event_date) && event.status !== 'cancelled').slice(0, 5)
  return (
    <main className="dashboard-main student-page">
      <div className="dashboard-welcome"><span className="dashboard-kicker">Organizer dashboard</span><h1>Let’s make something memorable, {user.name.split(' ')[0]}.</h1><p>Create experiences, manage registrations, and keep every event on track.</p></div>
      <section className="stat-grid organizer-stat-grid" aria-label="Organizer summary"><article><span className="stat-icon"><CalendarCheck2 /></span><div><strong>{events.length}</strong><span>Total events</span></div></article><article><span className="stat-icon"><FileClock /></span><div><strong>{count('draft')}</strong><span>Drafts</span></div></article><article><span className="stat-icon"><Send /></span><div><strong>{count('pending_approval')}</strong><span>Submitted</span></div></article><article><span className="stat-icon"><Send /></span><div><strong>{count('published')}</strong><span>Published</span></div></article><article><span className="stat-icon"><Ban /></span><div><strong>{count('cancelled')}</strong><span>Cancelled</span></div></article><article><span className="stat-icon"><TicketCheck /></span><div><strong>{totalRegistrations}</strong><span>Registrations</span></div></article><article><span className="stat-icon"><UsersRound /></span><div><strong>{totalWaitlist}</strong><span>Waitlisted</span></div></article></section>
      {loading ? <LoadingState message="Loading your events…" /> : error ? <ErrorState message={getApiErrorMessage(error, 'Could not load your organizer dashboard.')} onRetry={refresh} /> : <section className="dashboard-section"><div className="section-title-row"><div><span className="section-kicker">Your schedule</span><h2>Upcoming events</h2></div><Link className="text-link" to="/club/events">Manage all events →</Link></div>{upcoming.length ? <div className="upcoming-table">{upcoming.map((event) => <Link to={`/club/events/${event.id}`} key={event.id}><StatusBadge value={event.status} /><strong>{event.title}</strong><span>{formatDateTime(event.event_date)}</span><span>{event.registered_count}/{event.capacity} registered</span></Link>)}</div> : <EmptyState title="No upcoming events" message="Create your first event to start building your organizer schedule." actionLabel="Create event" actionTo="/club/events/new" />}</section>}
    </main>
  )
}

export default OrganizerDashboard
