import { useCallback, useEffect, useState } from 'react'
import EmptyState from '../../../../frontend/src/components/EmptyState.jsx'
import ErrorState from '../../../../frontend/src/components/ErrorState.jsx'
import EventCard from '../../../../frontend/src/components/EventCard.jsx'
import LoadingState from '../../../../frontend/src/components/LoadingState.jsx'
import { getApiErrorMessage } from '../../../../frontend/src/services/errors.js'
import { getSavedEvents } from '../../../../frontend/src/services/registrations.js'

export default function SavedEventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setEvents(await getSavedEvents()) } catch (requestError) { setError(requestError) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  return <main className="dashboard-main student-page"><div className="page-heading"><span className="dashboard-kicker">Bookmarks</span><h1>Saved events</h1><p>Keep an eye on events before deciding to register.</p></div>{loading ? <LoadingState message="Loading saved events…" /> : error ? <ErrorState message={getApiErrorMessage(error, 'Could not load saved events.')} onRetry={load} /> : events.length ? <div className="event-grid">{events.map((event) => <EventCard event={event} key={event.id} />)}</div> : <EmptyState title="Nothing saved yet" message="Save events you want to revisit." actionLabel="Explore events" actionTo="/events" />}</main>
}
