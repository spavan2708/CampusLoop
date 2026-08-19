import api from './api.js'

export async function getMyRegistrations() {
  const response = await api.get('/registrations/me')
  return response.data
}

export async function registerForEvent(eventId) {
  const response = await api.post(`/registrations/events/${eventId}`)
  return response.data
}

export async function cancelEventRegistration(eventId) {
  const response = await api.delete(`/registrations/events/${eventId}`)
  return response.data
}
