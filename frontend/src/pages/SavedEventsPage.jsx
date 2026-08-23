import { useEffect, useState } from 'react'
import EventCard from '../components/EventCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { getSavedEvents, unsaveEvent } from '../services/registrations.js'

export default function SavedEventsPage() {
  const [events, setEvents] = useState(null)
  useEffect(() => {
    getSavedEvents().then(setEvents)
  }, [])
  const handleUnsave = async (eventId) => {
    await unsaveEvent(eventId)
    setEvents((current) => {
      if (current === null) return null
      return current.filter((event) => event.id !== eventId)
    })
  }
  return (
    <main className="dashboard-main student-page">
      <div className="page-heading">
        <span className="dashboard-kicker">Bookmarks</span>
        <h1>Saved events</h1>
      </div>
      {events === null ? (
        <LoadingState />
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