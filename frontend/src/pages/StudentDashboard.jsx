import { CalendarCheck2, Compass, TicketCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import EventCard from '../components/EventCard.jsx'
import LoadingState from '../components/LoadingState.jsx'
import useAuth from '../context/useAuth.js'
import useStudentData from '../context/useStudentData.js'
import { getApiErrorMessage } from '../services/errors.js'
import { isPast } from '../utils/events.js'

function StudentDashboard() {
  const { user } = useAuth()
  const { events, registrations, loading, error, refresh } = useStudentData()
  const upcomingEvents = events.filter((event) => !isPast(event.event_date)).slice(0, 3)
  const upcomingRegistrations = registrations.filter((item) => !isPast(item.event.event_date) && item.event.status !== 'cancelled')
  return (
    <main className="dashboard-main student-page">
      <div className="dashboard-welcome"><span className="dashboard-kicker">Student dashboard</span><h1>Welcome back, {user.name.split(' ')[0]}.</h1><p>Discover what’s happening on campus and keep your plans in one place.</p></div>
      <section className="stat-grid" aria-label="Dashboard summary">
        <article><span className="stat-icon"><Compass /></span><div><strong>{events.length}</strong><span>Published events</span></div></article>
        <article><span className="stat-icon"><TicketCheck /></span><div><strong>{registrations.length}</strong><span>Total registrations</span></div></article>
        <article><span className="stat-icon"><CalendarCheck2 /></span><div><strong>{upcomingRegistrations.length}</strong><span>Upcoming registered</span></div></article>
      </section>
      {loading ? <LoadingState message="Loading your campus events…" /> : error ? <ErrorState message={getApiErrorMessage(error, 'Could not load your dashboard.')} onRetry={refresh} /> : (
        <section className="dashboard-section">
          <div className="section-title-row"><div><span className="section-kicker">Coming up</span><h2>Upcoming events</h2></div><Link className="text-link" to="/student/events">Explore all events →</Link></div>
          {upcomingEvents.length ? <div className="event-grid">{upcomingEvents.map((event) => <EventCard key={event.id} event={event} registered={registrations.some((item) => item.event.id === event.id)} />)}</div> : <EmptyState title="No upcoming events" message="Published campus events will appear here as soon as organizers add them." />}
        </section>
      )}
    </main>
  )
}

export default StudentDashboard
