import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')

if (!baseURL) throw new Error('VITE_API_URL must be configured for the Club Portal')

export const TOKEN_STORAGE_KEY = 'campusloop_club_access_token'
export const AUTH_EXPIRED_EVENT = 'campusloop:club-auth-expired'

const api = axios.create({ baseURL, headers: { Accept: 'application/json' } })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_STORAGE_KEY)) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
    return Promise.reject(error)
  },
)

export const apiClient = api
export default api
