import { CalendarClock, LoaderCircle, Save } from 'lucide-react'
import { useState } from 'react'
import useUnsavedChanges from '../context/useUnsavedChanges.js'
import { toApiDateTime, toLocalDateTimeInput } from '../utils/events.js'

const emptyForm = { title: '', description: '', category: '', venue: '', event_date: '', end_date: '', registration_deadline: '', capacity: '', tags: '', eligibility: 'Open to all students', instructions: '', contact_details: '', external_link: '', is_paid: false, entry_fee_rupees: '' }

function EventForm({ event, onSubmit, submitLabel = 'Save event', busy = false }) {
  const [form, setForm] = useState(() => event ? {
    title: event.title,
    description: event.description,
    category: event.category,
    venue: event.venue,
    event_date: toLocalDateTimeInput(event.event_date),
    registration_deadline: toLocalDateTimeInput(event.registration_deadline),
    capacity: String(event.capacity),
    end_date: event.end_date ? toLocalDateTimeInput(event.end_date) : '', tags: event.tags || '', eligibility: event.eligibility || '', instructions: event.instructions || '', contact_details: event.contact_details || '', external_link: event.external_link || '', is_paid: event.is_paid, entry_fee_rupees: event.entry_fee_paise ? String(event.entry_fee_paise / 100) : '',
  } : emptyForm)
  const [errors, setErrors] = useState({})
  const [dirty, setDirty] = useState(false)

  useUnsavedChanges(dirty, 'Your event details have not been saved. Leaving will discard everything entered since the last save.')

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
    if (form.end_date && new Date(form.end_date) <= eventDate) next.end_date = 'End time must be after the start time.'
    if (form.is_paid && Number(form.entry_fee_rupees) <= 0) next.entry_fee_rupees = 'Enter a positive fee in rupees.'
    setErrors(next)
    return Object.keys(next).length === 0
  }
  async function handleSubmit(browserEvent) {
    browserEvent.preventDefault()
    if (!validate() || busy) return
    const { entry_fee_rupees, ...fields } = form
    const saved = await onSubmit({ ...fields, title: form.title.trim(), description: form.description.trim(), category: form.category.trim(), venue: form.venue.trim(), capacity: Number(form.capacity), entry_fee_paise: form.is_paid ? Math.round(Number(entry_fee_rupees) * 100) : 0, event_date: toApiDateTime(form.event_date), end_date: form.end_date ? toApiDateTime(form.end_date) : null, registration_deadline: toApiDateTime(form.registration_deadline) })
    if (saved !== false) setDirty(false)
  }

  return <form className="event-form" onSubmit={handleSubmit} noValidate>
    <fieldset className="form-section"><legend>Event essentials</legend><p>Give students the information they need to understand the event.</p><div className="event-form-grid">
      <label className="field-wide"><span>Event title</span><input value={form.title} maxLength="150" onChange={(e) => update('title', e.target.value)} aria-invalid={Boolean(errors.title)} />{errors.title && <small>{errors.title}</small>}</label>
      <label><span>Category</span><input value={form.category} maxLength="80" placeholder="Technology, Cultural…" onChange={(e) => update('category', e.target.value)} aria-invalid={Boolean(errors.category)} />{errors.category && <small>{errors.category}</small>}</label>
      <label><span>Venue</span><input value={form.venue} maxLength="150" onChange={(e) => update('venue', e.target.value)} aria-invalid={Boolean(errors.venue)} />{errors.venue && <small>{errors.venue}</small>}</label>
      <label className="field-wide"><span>Description</span><textarea rows="6" value={form.description} onChange={(e) => update('description', e.target.value)} aria-invalid={Boolean(errors.description)} />{errors.description && <small>{errors.description}</small>}</label></div></fieldset>
    <fieldset className="form-section"><legend>Schedule and capacity</legend><p>All times use your device’s local timezone.</p><div className="event-form-grid">
      <label><span>Event date and time</span><input type="datetime-local" value={form.event_date} onChange={(e) => update('event_date', e.target.value)} aria-invalid={Boolean(errors.event_date)} />{errors.event_date && <small>{errors.event_date}</small>}</label>
      <label><span>End date and time (optional)</span><input type="datetime-local" value={form.end_date} onChange={(e) => update('end_date', e.target.value)} aria-invalid={Boolean(errors.end_date)} />{errors.end_date && <small>{errors.end_date}</small>}</label>
      <label><span>Registration deadline</span><input type="datetime-local" value={form.registration_deadline} onChange={(e) => update('registration_deadline', e.target.value)} aria-invalid={Boolean(errors.registration_deadline)} />{errors.registration_deadline && <small>{errors.registration_deadline}</small>}</label>
      <label><span>Capacity</span><input type="number" min="1" step="1" value={form.capacity} onChange={(e) => update('capacity', e.target.value)} aria-invalid={Boolean(errors.capacity)} />{errors.capacity && <small>{errors.capacity}</small>}</label></div></fieldset>
    <fieldset className="form-section"><legend>Student information</legend><p>Add eligibility, contact details, and any rules students should know.</p><div className="event-form-grid">
      <label><span>Tags (comma separated)</span><input value={form.tags} onChange={(e) => update('tags', e.target.value)} /></label>
      <label><span>Eligibility</span><input value={form.eligibility} onChange={(e) => update('eligibility', e.target.value)} /></label>
      <label><span>Contact details</span><input value={form.contact_details} onChange={(e) => update('contact_details', e.target.value)} /></label>
      <label><span>External link (optional)</span><input type="url" value={form.external_link} onChange={(e) => update('external_link', e.target.value)} /></label>
      <label className="field-wide"><span>Rules and instructions</span><textarea rows="4" value={form.instructions} onChange={(e) => update('instructions', e.target.value)} /></label>
      <label className="fee-toggle"><span><input type="checkbox" checked={form.is_paid} onChange={(e) => update('is_paid', e.target.checked)} /> Paid event</span></label>
      {form.is_paid && <label><span>Entry fee (₹)</span><input type="number" min="1" step="0.01" value={form.entry_fee_rupees} onChange={(e) => update('entry_fee_rupees', e.target.value)} aria-invalid={Boolean(errors.entry_fee_rupees)} />{errors.entry_fee_rupees && <small>{errors.entry_fee_rupees}</small>}<small>Online payment is not enabled yet; this prepares the event record only.</small></label>}
    </div></fieldset>
    <div className="form-note"><CalendarClock size={18} /><p>Times are entered in your local timezone. New events are drafts and become visible only after central approval and publication.</p></div>
    <div className="sticky-form-actions"><span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span><button className="button button-primary" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} /> Saving…</> : <><Save size={17} /> {submitLabel}</>}</button></div>
  </form>
}

export default EventForm
