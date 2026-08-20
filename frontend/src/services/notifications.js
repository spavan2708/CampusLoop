import api from './api.js'

export const getNotifications = async (params = {}) => (await api.get('/notifications', { params })).data
export const getUnreadCount = async () => (await api.get('/notifications/unread-count')).data.count
export const markNotificationRead = async (id) => (await api.patch(`/notifications/${id}/read`)).data
export const markAllNotificationsRead = async () => (await api.patch('/notifications/read-all')).data
export const archiveNotification = async (id) => api.delete(`/notifications/${id}`)
export const getNotificationPreferences = async () => (await api.get('/notifications/preferences')).data
export const updateNotificationPreferences = async (payload) => (await api.patch('/notifications/preferences', payload)).data
