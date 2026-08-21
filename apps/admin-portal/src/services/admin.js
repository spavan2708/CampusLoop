import api from '../api.js'
export const getClubs = async (approvalStatus = '') => (await api.get('/admin/clubs', { params: approvalStatus ? { approval_status: approvalStatus } : {} })).data
export const getClub = async (id) => (await api.get(`/admin/clubs/${id}`)).data
export const createClub = async (payload) => (await api.post('/admin/clubs', payload)).data
export const setClubActive = async (id, isActive) => (await api.patch(`/admin/clubs/${id}/status`, { is_active: isActive })).data
export const getEvents = async (eventStatus = '') => (await api.get('/admin/events', { params: eventStatus ? { event_status: eventStatus } : {} })).data
export const getEvent = async (id) => (await api.get(`/admin/events/${id}`)).data
export const getReviews = async (id) => (await api.get(`/admin/events/${id}/reviews`)).data
export const moderateEvent = async (id, action, reason = null) => (await api.post(`/admin/events/${id}/${action}`, { reason })).data
export const toggleFeatured = async (id) => (await api.post(`/admin/events/${id}/feature`)).data
export const getUsers = async (params = {}) => (await api.get('/admin/users', { params })).data
