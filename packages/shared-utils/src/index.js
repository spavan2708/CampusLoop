export function formatLocalDateTime(value, locale) {
  if (!value) return 'Date to be announced'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatMoney(amountPaise = 0, currency = 'INR', locale = 'en-IN') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountPaise / 100)
}

export function normalizeEmail(value = '') {
  return value.trim().toLowerCase()
}
