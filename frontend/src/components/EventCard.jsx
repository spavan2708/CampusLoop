import { CalendarDays, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateTime, getRegistrationState } from '../utils/events.js'

function EventCard({ event, registered = false, detailsPath }) {
  const state = getRegistrationState(event)
  const remaining = Math.max(0, event.capacity - event.registered_count)
  const href = detailsPath || `/student/events/${event.id}`
  return (
    <article className="event-card">
      <Link className="event-poster" to={href} aria-label={`View ${event.title}`}>
        {event.poster_url ? <img loading="lazy" width="640" height="480" src={`${import.meta.env.VITE_API_URL}${event.poster_url}`} alt={`${event.title} poster`} /> : <span>{event.title.charAt(0)}</span>}
        <em>{event.is_paid ? `₹${(event.entry_fee_paise / 100).toFixed(0)}` : 'Free'}</em>
      </Link>
      <div className="event-card-topline"><span className="category-pill">{event.category}</span><span className={`event-status status-${state.key}`}>{registered ? 'Registered' : state.label}</span></div>
      <h2><Link to={href}>{event.title}</Link></h2>
      <p className="event-description">{event.description}</p>
      <dl className="event-meta">
        <div><CalendarDays /><dt>Date</dt><dd>{formatDateTime(event.event_date)}</dd></div>
        <div><MapPin /><dt>Venue</dt><dd>{event.venue}</dd></div>
        <div><Users /><dt>Availability</dt><dd>{remaining} of {event.capacity} spots left</dd></div>
      </dl>
      <div className="event-card-footer"><span>Register by {formatDateTime(event.registration_deadline)}</span><Link className="text-link" to={href}>View details →</Link></div>
    </article>
  )
}

export default EventCard
