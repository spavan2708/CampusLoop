import { useCallback, useEffect, useState } from 'react'
import EmptyState from '../../../../frontend/src/components/EmptyState.jsx'
import ErrorState from '../../../../frontend/src/components/ErrorState.jsx'
import EventCard from '../../../../frontend/src/components/EventCard.jsx'
import LoadingState from '../../../../frontend/src/components/LoadingState.jsx'
import StatusMessage from '../../../../frontend/src/components/StatusMessage.jsx'
import { getApiErrorMessage } from '../../../../frontend/src/services/errors.js'
import { getSavedEvents, unsaveEvent } from '../../../../frontend/src/services/registrations.js'

export default function SavedEventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saveError, setSaveError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setEvents(await getSavedEvents()) } catch (requestError) { setError(requestError) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  async function handleUnsave(eventId) {
    try {
      await unsaveEvent(eventId)
      setSaveError('')
      setEvents((current) => current.filter((event) => event.id !== eventId))
    } catch (requestError) {
      setSaveError(getApiErrorMessage(requestError, 'Could not remove this saved event.'))
    }
  }
  return <main className="dashboard-main student-page"><div className="page-heading"><span className="dashboard-kicker">Bookmarks</span><h1>Saved events</h1><p>Keep an eye on events before deciding to register.</p></div><StatusMessage type="error">{saveError}</StatusMessage>{loading ? <LoadingState message="Loading saved events…" /> : error ? <ErrorState message={getApiErrorMessage(error, 'Could not load saved events.')} onRetry={load} /> : events.length ? <div className="event-grid">{events.map((event) => <EventCard event={event} key={event.id} isSaved={true} onSaveToggle={handleUnsave} />)}</div> : <EmptyState title="Nothing saved yet" message="Save events you want to revisit." actionLabel="Explore events" actionTo="/events" />}</main>
}
