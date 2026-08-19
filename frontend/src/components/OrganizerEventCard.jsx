import { CalendarDays, Edit3, Eye, MapPin, Send, UserRoundSearch, Users, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../utils/events.js'

function OrganizerEventCard({ event, actionBusy, onPublish, onCancel }) {
  const isCancelled = event.status === 'cancelled'
  const isPublished = event.status === 'published'
  return <article className="organizer-event-card">
    <div className="organizer-event-main"><div className="event-card-topline"><span className="category-pill">{event.category}</span><span className={`event-status organizer-status-${event.status}`}>{event.status}</span></div><h2>{event.title}</h2><div className="organizer-event-meta"><span><CalendarDays />{formatDateTime(event.event_date)}</span><span><MapPin />{event.venue}</span><span><Users />{event.registered_count}/{event.capacity} registered</span></div></div>
    <div className="organizer-event-actions">
      <Link className="button button-secondary button-small" to={`/organizer/events/${event.id}`}><Eye /> View</Link>
      {!isCancelled && <Link className="button button-secondary button-small" to={`/organizer/events/${event.id}/edit`}><Edit3 /> Edit</Link>}
      {!isPublished && !isCancelled && <button className="button button-primary button-small" type="button" disabled={actionBusy} onClick={() => onPublish(event)}><Send /> Publish</button>}
      {!isCancelled && <button className="button button-danger button-small" type="button" disabled={actionBusy} onClick={() => onCancel(event)}><XCircle /> Cancel</button>}
      <Link className="button button-secondary button-small" to={`/organizer/events/${event.id}/attendees`}><UserRoundSearch /> Attendees</Link>
    </div>
  </article>
}

export default OrganizerEventCard
