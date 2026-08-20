import axios from 'axios'

export function createApiClient({ baseURL, getAccessToken = () => null, onUnauthorized = () => {} }) {
  const client = axios.create({ baseURL, headers: { Accept: 'application/json' } })
  client.interceptors.request.use((config) => {
    const token = getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) onUnauthorized(error)
      return Promise.reject(error)
    },
  )
  return client
}

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error.response) return 'Cannot reach the CampusLoop API. Check your connection and try again.'
  return error.response.data?.detail || fallback
}
