import { useState } from 'react'
import { Link } from 'react-router-dom'
import StatusMessage from '../components/StatusMessage.jsx'
import { createClubLogin } from '../services/admin.js'
import { getApiErrorMessage } from '../services/errors.js'
import useUnsavedChanges from '../context/useUnsavedChanges.js'

const initial = { club_name: '', description: '', category: '', contact_email: '', faculty_coordinator: '', student_coordinator: '', admin_name: '', admin_email: '', password: '' }

export default function CreateClubPage() {
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  useUnsavedChanges(Object.values(form).some(Boolean), 'This club account has not been created. Leaving will discard the login and profile details.')
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setMessage(null)
    try {
      const club = await createClubLogin(form)
      setForm(initial)
      setMessage({ type: 'success', text: `${club.name} and its club login were created. Give the login details to the club administrator securely.` })
    } catch (error) {
      setMessage({ type: 'error', text: getApiErrorMessage(error, 'Could not create the club login.') })
    } finally { setBusy(false) }
  }

  return <main className="dashboard-main student-page"><Link className="back-link" to="/admin">← Back to administration</Link><div className="page-heading"><span className="dashboard-kicker">Account provisioning</span><h1>Create a club login</h1><p>The club is approved immediately. Its administrator can sign in through the Club portal and change the temporary password.</p></div><StatusMessage type={message?.type}>{message?.text}</StatusMessage><section className="form-card"><form className="event-form event-form-grid" onSubmit={submit}><label><span>Club name</span><input required minLength="2" value={form.club_name} onChange={(e) => update('club_name', e.target.value)} /></label><label><span>Category</span><input required minLength="2" value={form.category} onChange={(e) => update('category', e.target.value)} /></label><label className="field-wide"><span>Description</span><textarea required minLength="10" rows="4" value={form.description} onChange={(e) => update('description', e.target.value)} /></label><label><span>Club contact email</span><input required type="email" value={form.contact_email} onChange={(e) => update('contact_email', e.target.value)} /></label><label><span>Faculty coordinator</span><input required minLength="2" value={form.faculty_coordinator} onChange={(e) => update('faculty_coordinator', e.target.value)} /></label><label><span>Student coordinator</span><input required minLength="2" value={form.student_coordinator} onChange={(e) => update('student_coordinator', e.target.value)} /></label><label><span>Club administrator name</span><input required minLength="2" value={form.admin_name} onChange={(e) => update('admin_name', e.target.value)} /></label><label><span>Club login email</span><input required type="email" value={form.admin_email} onChange={(e) => update('admin_email', e.target.value)} /></label><label><span>Temporary password</span><input required type="password" minLength="8" autoComplete="new-password" value={form.password} onChange={(e) => update('password', e.target.value)} /><small>The club administrator should change this after signing in.</small></label><div className="field-wide"><button className="button button-primary" disabled={busy} type="submit">{busy ? 'Creating…' : 'Create club and login'}</button></div></form></section></main>
}
