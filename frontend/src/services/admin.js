import api from './api.js'

export const getAdminClubs = async (approvalStatus = '') => (await api.get('/admin/clubs', { params: approvalStatus ? { approval_status: approvalStatus } : {} })).data
export const getAdminEvents = async (eventStatus = '') => (await api.get('/admin/events', { params: eventStatus ? { event_status: eventStatus } : {} })).data
export const moderateEvent = async (id, action, reason = null) => (await api.post(`/admin/events/${id}/${action}`, { reason })).data
export const toggleFeatured = async (id) => (await api.post(`/admin/events/${id}/feature`)).data
export const createClubLogin = async (payload) => (await api.post('/admin/clubs', payload)).data
export const setClubActive = async (id, isActive) => (await api.patch(`/admin/clubs/${id}/status`, { is_active: isActive })).data
export const deleteClub = async (clubId) => (await api.delete(`/admin/clubs/${clubId}`)).data
export const getEventReviews = async (id) => (await api.get(`/admin/events/${id}/reviews`)).data
