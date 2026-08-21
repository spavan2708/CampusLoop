export function mediaUrl(url) {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return `${import.meta.env.VITE_API_URL}${url}`
  return `${import.meta.env.VITE_API_URL}/${url}`
}