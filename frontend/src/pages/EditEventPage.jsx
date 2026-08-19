import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import EventForm from '../components/EventForm.jsx'
import LoadingState from '../components/LoadingState.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import useOrganizerData from '../context/useOrganizerData.js'
import { getApiErrorMessage } from '../services/errors.js'

function EditEventPage() {
  const { eventId } = useParams()
  const { events, loading, editEvent } = useOrganizerData()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const event = events.find((item) => item.id === Number(eventId))
  async function handleSubmit(payload) {
    setBusy(true); setError('')
    try { await editEvent(event.id, payload); navigate(`/organizer/events/${event.id}`, { replace: true, state: { message: 'Event changes saved.' } }); return true }
    catch (requestError) { setError(getApiErrorMessage(requestError, 'Could not save event changes.')); return false }
    finally { setBusy(false) }
  }
  if (loading) return <main className="dashboard-main"><LoadingState message="Loading your event…" /></main>
  if (!event) return <main className="dashboard-main"><EmptyState title="Event not found" message="This event does not belong to your organizer account." actionLabel="Manage events" actionTo="/organizer/events" /></main>
  if (event.status === 'cancelled') return <main className="dashboard-main"><EmptyState title="Cancelled events cannot be edited" message="The backend permanently prevents changes to cancelled events." actionLabel="View event" actionTo={`/organizer/events/${event.id}`} /></main>
  return <main className="dashboard-main student-page"><Link className="back-link" to={`/organizer/events/${event.id}`}><ArrowLeft /> Back to event</Link><div className="page-heading"><span className="dashboard-kicker">Edit event</span><h1>{event.title}</h1><p>Update event details while respecting its registration schedule.</p></div><StatusMessage type="error">{error}</StatusMessage><section className="form-card"><EventForm event={event} onSubmit={handleSubmit} busy={busy} submitLabel="Save changes" /></section></main>
}

export default EditEventPage
