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

export async function getEventAttendees(eventId) {
  const response = await api.get(`/registrations/events/${eventId}/attendees`)
  return response.data
}

export const getSavedEvents = async () => (await api.get('/registrations/saved')).data
export const saveEvent = async (eventId) => (await api.post(`/registrations/events/${eventId}/save`)).data
export const unsaveEvent = async (eventId) => (await api.delete(`/registrations/events/${eventId}/save`)).data
