import { Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import StatusMessage from '../../../../frontend/src/components/StatusMessage.jsx'
import useAuth from '../../../../frontend/src/context/useAuth.js'
import useUnsavedChanges from '../../../../frontend/src/context/useUnsavedChanges.js'
import { changePassword } from '../../../../frontend/src/services/auth.js'
import { getApiErrorMessage } from '../../../../frontend/src/services/errors.js'
import { formatDate } from '../../../../frontend/src/utils/events.js'

export default function ProfilePage() {
  const { user } = useAuth()
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  useUnsavedChanges(Object.values(passwords).some(Boolean), 'Your password form contains unsaved changes.')

  async function submitPassword(event) {
    event.preventDefault(); setMessage(null)
    if (passwords.next !== passwords.confirm) return setMessage({ type: 'error', text: 'New passwords do not match.' })
    setBusy(true)
    try { await changePassword(passwords.current, passwords.next); setPasswords({ current: '', next: '', confirm: '' }); setMessage({ type: 'success', text: 'Password changed successfully.' }) }
    catch (error) { setMessage({ type: 'error', text: getApiErrorMessage(error, 'Could not change your password.') }) }
    finally { setBusy(false) }
  }

  return <main className="dashboard-main"><div className="page-heading"><span className="dashboard-kicker">Account settings</span><h1>Your profile</h1><p>Review your CampusLoop account and keep it secure.</p></div><StatusMessage type={message?.type}>{message?.text}</StatusMessage><section className="profile-card"><div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div><div><h2>{user.name}</h2><span className="category-pill">Student</span></div><dl><div><UserRound /><dt>Name</dt><dd>{user.name}</dd></div><div><Mail /><dt>Email</dt><dd>{user.email}</dd></div><div><ShieldCheck /><dt>Member since</dt><dd>{formatDate(user.created_at)}</dd></div></dl></section><section className="form-card password-card"><h2>Change password</h2><p>Use at least eight characters and a password unique to CampusLoop.</p><form className="event-form event-form-grid" onSubmit={submitPassword}><label className="field-wide"><span>Current password</span><input required minLength="8" type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} /></label><label><span>New password</span><input required minLength="8" type="password" autoComplete="new-password" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} /></label><label><span>Confirm new password</span><input required minLength="8" type="password" autoComplete="new-password" value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} /></label><div className="field-wide"><button className="button button-primary" disabled={busy}>{busy ? 'Changing…' : 'Change password'}</button></div></form></section></main>
}
