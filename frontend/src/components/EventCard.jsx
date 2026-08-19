import { CalendarDays, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateTime, getRegistrationState } from '../utils/events.js'

function EventCard({ event, registered = false }) {
  const state = getRegistrationState(event)
  const remaining = Math.max(0, event.capacity - event.registered_count)
  return (
    <article className="event-card">
      <div className="event-card-topline"><span className="category-pill">{event.category}</span><span className={`event-status status-${state.key}`}>{registered ? 'Registered' : state.label}</span></div>
      <h2><Link to={`/student/events/${event.id}`}>{event.title}</Link></h2>
      <p className="event-description">{event.description}</p>
      <dl className="event-meta">
        <div><CalendarDays /><dt>Date</dt><dd>{formatDateTime(event.event_date)}</dd></div>
        <div><MapPin /><dt>Venue</dt><dd>{event.venue}</dd></div>
        <div><Users /><dt>Availability</dt><dd>{remaining} of {event.capacity} spots left</dd></div>
      </dl>
      <div className="event-card-footer"><span>Register by {formatDateTime(event.registration_deadline)}</span><Link className="text-link" to={`/student/events/${event.id}`}>View details →</Link></div>
    </article>
  )
}

export default EventCard
