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

export async function getMyEvents(filters = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value != null))
  const response = await api.get('/events/mine', { params })
  return response.data
}

export async function createEvent(payload) {
  const response = await api.post('/events', payload)
  return response.data
}

export async function updateEvent(eventId, payload) {
  const response = await api.patch(`/events/${eventId}`, payload)
  return response.data
}

export async function publishEvent(eventId) {
  const response = await api.post(`/events/${eventId}/publish`)
  return response.data
}

export async function cancelEvent(eventId) {
  const response = await api.post(`/events/${eventId}/cancel`)
  return response.data
}
