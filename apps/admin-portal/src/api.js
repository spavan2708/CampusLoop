import { createApiClient } from '@campusloop/shared-api'

const baseURL = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')

if (!baseURL) {
  throw new Error('VITE_API_URL must be configured for the Admin Portal')
}

export const apiClient = createApiClient({ baseURL })
