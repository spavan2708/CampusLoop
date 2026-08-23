import { useEffect, useState } from 'react'
import EventCard from '../components/EventCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import { getApiErrorMessage } from '../services/errors.js'
import { getSavedEvents, unsaveEvent } from '../services/registrations.js'

export default function SavedEventsPage() {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)
  const [saveError, setSaveError] = useState('')
  useEffect(() => {
    getSavedEvents().then(setEvents).catch((requestError) => { setError(requestError); setEvents([]) })
  }, [])
  const handleUnsave = async (eventId) => {
    try {
      await unsaveEvent(eventId)
      setSaveError('')
      setEvents((current) => current.filter((event) => event.id !== eventId))
    } catch (requestError) {
      setSaveError(getApiErrorMessage(requestError, 'Could not remove this saved event.'))
    }
  }
  return (
    <main className="dashboard-main student-page">
      <div className="page-heading">
        <span className="dashboard-kicker">Bookmarks</span>
        <h1>Saved events</h1>
      </div>
      <StatusMessage type="error">{saveError}</StatusMessage>
      {events === null ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={getApiErrorMessage(error, 'Could not load saved events.')} />
      ) : events.length ? (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard event={event} key={event.id} isSaved={true} onSaveToggle={handleUnsave} />
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing saved yet" message="Save events you want to revisit." />
      )}
    </main>
  )
}