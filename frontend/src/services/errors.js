export function getApiErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item.msg).join('. ')
  }
  if (error?.code === 'ERR_NETWORK') {
    return 'Cannot reach the CampusLoop API. Make sure the backend is running.'
  }
  return fallback
}
