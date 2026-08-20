import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EventForm from '../components/EventForm.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import useOrganizerData from '../context/useOrganizerData.js'
import { getApiErrorMessage } from '../services/errors.js'

function CreateEventPage() {
  const { addEvent } = useOrganizerData()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function handleSubmit(payload) {
    setBusy(true); setError('')
    try { const event = await addEvent(payload); navigate(`/club/events/${event.id}`, { replace: true, state: { message: 'Event created and saved as a draft.' } }); return true }
    catch (requestError) { setError(getApiErrorMessage(requestError, 'Could not create the event.')); return false }
    finally { setBusy(false) }
  }
  return <main className="dashboard-main student-page"><div className="page-heading"><span className="dashboard-kicker">New event</span><h1>Create an event</h1><p>Add every detail now, then publish when you are ready for students to register.</p></div><StatusMessage type="error">{error}</StatusMessage><section className="form-card"><EventForm onSubmit={handleSubmit} busy={busy} submitLabel="Save as draft" /></section></main>
}

export default CreateEventPage
