import api from './api.js'

export const getClubs = async () => (await api.get('/clubs')).data
export const getClub = async (slug) => (await api.get(`/clubs/${slug}`)).data
export const getClubEvents = async (slug) => (await api.get(`/clubs/${slug}/events`)).data
export const getMyClub = async () => (await api.get('/clubs/me/profile')).data
export const updateMyClub = async (payload) => (await api.patch('/clubs/me/profile', payload)).data
export const uploadClubLogo = async (file) => {
  const body = new FormData(); body.append('image', file)
  return (await api.post('/clubs/me/logo', body)).data
}
export const uploadClubBanner = async (file) => {
  const body = new FormData(); body.append('image', file)
  return (await api.post('/clubs/me/banner', body)).data
}
