export function parseApiDate(value) {
  if (!value) return null
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)
}

export function formatDateTime(value) {
  const date = parseApiDate(value)
  if (!date || Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatDate(value) {
  const date = parseApiDate(value)
  if (!date || Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

export function isPast(value) {
  const date = parseApiDate(value)
  return date ? date.getTime() < Date.now() : false
}

export function getRegistrationState(event) {
  if (event.status !== 'published') return { key: 'closed', label: 'Closed' }
  if (isPast(event.registration_deadline)) return { key: 'closed', label: 'Registration closed' }
  if (event.registered_count >= event.capacity) return { key: 'full', label: 'Event full' }
  return { key: 'open', label: 'Registration open' }
}

export function toLocalDateTimeInput(value) {
  const date = parseApiDate(value)
  if (!date || Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function toApiDateTime(value) {
  return value ? new Date(value).toISOString() : value
}
