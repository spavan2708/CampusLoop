import { CalendarClock, LoaderCircle, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toApiDateTime, toLocalDateTimeInput } from '../utils/events.js'

const emptyForm = { title: '', description: '', category: '', venue: '', event_date: '', registration_deadline: '', capacity: '' }

function EventForm({ event, onSubmit, submitLabel = 'Save event', busy = false }) {
  const [form, setForm] = useState(() => event ? {
    title: event.title,
    description: event.description,
    category: event.category,
    venue: event.venue,
    event_date: toLocalDateTimeInput(event.event_date),
    registration_deadline: toLocalDateTimeInput(event.registration_deadline),
    capacity: String(event.capacity),
  } : emptyForm)
  const [errors, setErrors] = useState({})
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    function warnBeforeUnload(browserEvent) {
      if (!dirty) return
      browserEvent.preventDefault()
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [dirty])

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); setDirty(true); setErrors((current) => ({ ...current, [field]: '' })) }
  function validate() {
    const next = {}
    for (const field of ['title', 'description', 'category', 'venue', 'event_date', 'registration_deadline', 'capacity']) if (!String(form[field]).trim()) next[field] = 'This field is required.'
    const capacity = Number(form.capacity)
    if (form.capacity && (!Number.isInteger(capacity) || capacity <= 0)) next.capacity = 'Capacity must be a whole number greater than zero.'
    const eventDate = new Date(form.event_date)
    const deadline = new Date(form.registration_deadline)
    if (form.event_date && eventDate <= new Date()) next.event_date = 'Event date must be in the future.'
    if (form.event_date && form.registration_deadline && deadline >= eventDate) next.registration_deadline = 'Registration deadline must be before the event.'
    setErrors(next)
    return Object.keys(next).length === 0
  }
  async function handleSubmit(browserEvent) {
    browserEvent.preventDefault()
    if (!validate() || busy) return
    const saved = await onSubmit({ ...form, title: form.title.trim(), description: form.description.trim(), category: form.category.trim(), venue: form.venue.trim(), capacity: Number(form.capacity), event_date: toApiDateTime(form.event_date), registration_deadline: toApiDateTime(form.registration_deadline) })
    if (saved !== false) setDirty(false)
  }

  return <form className="event-form" onSubmit={handleSubmit} noValidate>
    <div className="event-form-grid">
      <label className="field-wide"><span>Event title</span><input value={form.title} maxLength="150" onChange={(e) => update('title', e.target.value)} aria-invalid={Boolean(errors.title)} />{errors.title && <small>{errors.title}</small>}</label>
      <label><span>Category</span><input value={form.category} maxLength="80" placeholder="Technology, Cultural…" onChange={(e) => update('category', e.target.value)} aria-invalid={Boolean(errors.category)} />{errors.category && <small>{errors.category}</small>}</label>
      <label><span>Venue</span><input value={form.venue} maxLength="150" onChange={(e) => update('venue', e.target.value)} aria-invalid={Boolean(errors.venue)} />{errors.venue && <small>{errors.venue}</small>}</label>
      <label className="field-wide"><span>Description</span><textarea rows="6" value={form.description} onChange={(e) => update('description', e.target.value)} aria-invalid={Boolean(errors.description)} />{errors.description && <small>{errors.description}</small>}</label>
      <label><span>Event date and time</span><input type="datetime-local" value={form.event_date} onChange={(e) => update('event_date', e.target.value)} aria-invalid={Boolean(errors.event_date)} />{errors.event_date && <small>{errors.event_date}</small>}</label>
      <label><span>Registration deadline</span><input type="datetime-local" value={form.registration_deadline} onChange={(e) => update('registration_deadline', e.target.value)} aria-invalid={Boolean(errors.registration_deadline)} />{errors.registration_deadline && <small>{errors.registration_deadline}</small>}</label>
      <label><span>Capacity</span><input type="number" min="1" step="1" value={form.capacity} onChange={(e) => update('capacity', e.target.value)} aria-invalid={Boolean(errors.capacity)} />{errors.capacity && <small>{errors.capacity}</small>}</label>
    </div>
    <div className="form-note"><CalendarClock size={18} /><p>Times are entered in your local timezone. New events are saved as drafts, so students cannot see them until you publish.</p></div>
    <button className="button button-primary" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} /> Saving…</> : <><Save size={17} /> {submitLabel}</>}</button>
  </form>
}

export default EventForm
