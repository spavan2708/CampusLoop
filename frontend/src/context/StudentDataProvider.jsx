import { useCallback, useEffect, useMemo, useState } from 'react'
import { getEvents } from '../services/events.js'
import { cancelEventRegistration, getMyRegistrations, registerForEvent } from '../services/registrations.js'
import StudentDataContext from './student-data-context.js'

function StudentDataProvider({ children }) {
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [eventData, registrationData] = await Promise.all([getEvents(), getMyRegistrations()])
      setEvents(eventData.items)
      setRegistrations(registrationData.items)
    } catch (requestError) {
      setError(requestError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // The initial fetch intentionally owns the provider's loading state.
    // eslint-disable-next-line react/set-state-in-effect
    refresh()
  }, [refresh])

  const register = useCallback(async (eventId) => {
    const registration = await registerForEvent(eventId)
    setRegistrations((current) => [registration, ...current.filter((item) => item.event.id !== eventId)])
    setEvents((current) => current.map((event) => event.id === eventId ? registration.event : event))
    return registration
  }, [])

  const cancel = useCallback(async (eventId) => {
    const registration = await cancelEventRegistration(eventId)
    setRegistrations((current) => current.filter((item) => item.event.id !== eventId))
    setEvents((current) => current.map((event) => event.id === eventId ? { ...event, registered_count: Math.max(0, event.registered_count - 1) } : event))
    return registration
  }, [])

  const value = useMemo(() => ({ events, registrations, loading, error, refresh, register, cancel }), [events, registrations, loading, error, refresh, register, cancel])
  return <StudentDataContext.Provider value={value}>{children}</StudentDataContext.Provider>
}

export default StudentDataProvider
