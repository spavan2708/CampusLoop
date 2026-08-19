import { useCallback, useEffect, useMemo, useState } from 'react'
import { cancelEvent, createEvent, getMyEvents, publishEvent, updateEvent } from '../services/events.js'
import OrganizerDataContext from './organizer-data-context.js'

function OrganizerDataProvider({ children }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try { const data = await getMyEvents(); setEvents(data.items) }
    catch (requestError) { setError(requestError) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    // The initial request intentionally controls provider loading state.
    // eslint-disable-next-line react/set-state-in-effect
    refresh()
  }, [refresh])

  const addEvent = useCallback(async (payload) => {
    const created = await createEvent(payload)
    setEvents((current) => [...current, created].sort((a, b) => a.event_date.localeCompare(b.event_date)))
    return created
  }, [])
  const editEvent = useCallback(async (eventId, payload) => {
    const updated = await updateEvent(eventId, payload)
    setEvents((current) => current.map((event) => event.id === eventId ? updated : event))
    return updated
  }, [])
  const publish = useCallback(async (eventId) => {
    const updated = await publishEvent(eventId)
    setEvents((current) => current.map((event) => event.id === eventId ? updated : event))
    return updated
  }, [])
  const cancel = useCallback(async (eventId) => {
    const updated = await cancelEvent(eventId)
    setEvents((current) => current.map((event) => event.id === eventId ? updated : event))
    return updated
  }, [])

  const value = useMemo(() => ({ events, loading, error, refresh, addEvent, editEvent, publish, cancel }), [events, loading, error, refresh, addEvent, editEvent, publish, cancel])
  return <OrganizerDataContext.Provider value={value}>{children}</OrganizerDataContext.Provider>
}

export default OrganizerDataProvider
