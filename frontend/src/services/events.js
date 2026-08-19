import api from './api.js'

export async function getEvents(filters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value != null),
  )
  const response = await api.get('/events', { params })
  return response.data
}

export async function getEvent(eventId) {
  const response = await api.get(`/events/${eventId}`)
  return response.data
}
