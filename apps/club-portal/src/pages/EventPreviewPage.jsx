import { ArrowLeft, CalendarDays, IndianRupee, MapPin, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import EmptyState from '../../../../frontend/src/components/EmptyState.jsx'
import LoadingState from '../../../../frontend/src/components/LoadingState.jsx'
import StatusBadge from '../../../../frontend/src/components/StatusBadge.jsx'
import useOrganizerData from '../../../../frontend/src/context/useOrganizerData.js'
import { formatDateTime } from '../../../../frontend/src/utils/events.js'

export default function EventPreviewPage() {
  const { eventId } = useParams()
  const { events, loading } = useOrganizerData()
  const event = events.find((item) => item.id === Number(eventId))
  if (loading) return <main className="dashboard-main"><LoadingState message="Preparing preview…" /></main>
  if (!event) return <main className="dashboard-main"><EmptyState title="Event not found" message="This event does not belong to your club." actionLabel="Manage events" actionTo="/club/events" /></main>
  const bannerUrl = event.banner_url?.startsWith('http') ? event.banner_url : `${import.meta.env.VITE_API_URL}${event.banner_url || ''}`
  return <main className="dashboard-main student-page"><Link className="back-link" to={`/club/events/${event.id}`}><ArrowLeft /> Back to management</Link><div className="preview-notice" role="status"><strong>Club preview</strong><span>This is a private preview. Students only see an event after central administration publishes it.</span></div><article className="club-preview-card">{event.banner_url && <img className="preview-banner" src={bannerUrl} alt="" />}<div className="preview-body"><div className="event-card-topline"><span className="category-pill">{event.category}</span><StatusBadge value={event.status} /></div><h1>{event.title}</h1><p>{event.description}</p><div className="preview-facts"><span><CalendarDays />{formatDateTime(event.event_date)}</span><span><MapPin />{event.venue}</span><span><Users />{event.registered_count}/{event.capacity} registered</span><span><IndianRupee />{event.is_paid ? `₹${(event.entry_fee_paise / 100).toFixed(2)} · pay later` : 'Free event'}</span></div>{event.instructions && <section><h2>Rules and instructions</h2><p>{event.instructions}</p></section>}</div></article></main>
}
