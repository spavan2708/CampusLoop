import { Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import ImageUploader from '../components/ImageUploader.jsx'
import LoadingState from '../components/LoadingState.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import useAuth from '../context/useAuth.js'
import { changePassword } from '../services/auth.js'
import { getMyClub, updateMyClub, uploadClubBanner, uploadClubLogo } from '../services/clubs.js'
import { getApiErrorMessage } from '../services/errors.js'
import { formatDate } from '../utils/events.js'
import useUnsavedChanges from '../context/useUnsavedChanges.js'

export default function ProfilePage() {
  const { user } = useAuth()
  const isClub = user.role === 'club_admin'
  const [club, setClub] = useState(null)
  const [profile, setProfile] = useState({ description: '', category: '', contact_email: '', faculty_coordinator: '', student_coordinator: '' })
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [busy, setBusy] = useState('')
  const [loading, setLoading] = useState(isClub)
  const [message, setMessage] = useState(null)
  const profileDirty = Boolean(club) && Object.keys(profile).some((key) => profile[key] !== (club[key] || ''))
  const passwordDirty = Object.values(passwords).some(Boolean)
  useUnsavedChanges(profileDirty || passwordDirty, 'Your profile or password form contains unsaved changes.')
  useEffect(() => { if (!isClub) return; getMyClub().then((data) => { setClub(data); setProfile({ description: data.description, category: data.category, contact_email: data.contact_email, faculty_coordinator: data.faculty_coordinator, student_coordinator: data.student_coordinator }) }).catch((error) => setMessage({ type: 'error', text: getApiErrorMessage(error, 'Could not load club profile.') })).finally(() => setLoading(false)) }, [isClub])
  async function saveProfile(event) {
    event.preventDefault(); setBusy('profile'); setMessage(null)
    try { const data = await updateMyClub(profile); setClub(data); setMessage({ type: 'success', text: 'Club profile updated.' }) }
    catch (error) { setMessage({ type: 'error', text: getApiErrorMessage(error, 'Could not update club profile.') }) }
    finally { setBusy('') }
  }
  async function upload(kind, file) {
    setBusy(kind); setMessage(null)
    try { const data = await (kind === 'logo' ? uploadClubLogo(file) : uploadClubBanner(file)); setClub(data); setMessage({ type: 'success', text: `${kind === 'logo' ? 'Logo' : 'Banner'} updated.` }) }
    catch (error) { setMessage({ type: 'error', text: getApiErrorMessage(error, 'Could not upload image.') }) }
    finally { setBusy('') }
  }
  async function submitPassword(event) {
    event.preventDefault(); setMessage(null)
    if (passwords.next !== passwords.confirm) return setMessage({ type: 'error', text: 'New passwords do not match.' })
    setBusy('password')
    try { await changePassword(passwords.current, passwords.next); setPasswords({ current: '', next: '', confirm: '' }); setMessage({ type: 'success', text: 'Password changed successfully.' }) }
    catch (error) { setMessage({ type: 'error', text: getApiErrorMessage(error, 'Could not change your password.') }) }
    finally { setBusy('') }
  }
  if (loading) return <main className="dashboard-main"><LoadingState message="Loading your club profile…" /></main>
  return <main className="dashboard-main"><div className="page-heading"><span className="dashboard-kicker">Account settings</span><h1>{isClub ? 'Club profile' : 'Your profile'}</h1><p>Keep account and public-facing information accurate.</p></div><StatusMessage type={message?.type}>{message?.text}</StatusMessage><section className="profile-card"><div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div><div><h2>{user.name}</h2><span className="category-pill">{user.role.replace('_', ' ')}</span></div><dl><div><UserRound /><dt>Name</dt><dd>{user.name}</dd></div><div><Mail /><dt>Email</dt><dd>{user.email}</dd></div><div><ShieldCheck /><dt>Member since</dt><dd>{formatDate(user.created_at)}</dd></div></dl></section>
    {isClub && club && <><section className="form-card"><div className="section-title-row"><div><span className="dashboard-kicker">Public identity</span><h2>Club media</h2></div></div><div className="media-grid"><ImageUploader label="Club logo" description="Square JPG, PNG, or WebP, up to 5 MB." imageUrl={club.logo_url} aspect="square" busy={busy === 'logo'} onUpload={(file) => upload('logo', file)} /><ImageUploader label="Profile banner" description="Wide JPG, PNG, or WebP, up to 5 MB." imageUrl={club.banner_url} busy={busy === 'banner'} onUpload={(file) => upload('banner', file)} /></div></section><section className="form-card"><h2>Club details</h2><form className="event-form event-form-grid" onSubmit={saveProfile}><label className="field-wide"><span>Description</span><textarea required minLength="10" rows="5" value={profile.description} onChange={(e) => setProfile({ ...profile, description: e.target.value })} /></label><label><span>Category</span><input required value={profile.category} onChange={(e) => setProfile({ ...profile, category: e.target.value })} /></label><label><span>Contact email</span><input required type="email" value={profile.contact_email} onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })} /></label><label><span>Faculty coordinator</span><input required value={profile.faculty_coordinator} onChange={(e) => setProfile({ ...profile, faculty_coordinator: e.target.value })} /></label><label><span>Student coordinator</span><input required value={profile.student_coordinator} onChange={(e) => setProfile({ ...profile, student_coordinator: e.target.value })} /></label><div className="field-wide"><button className="button button-primary" disabled={Boolean(busy)}>{busy === 'profile' ? 'Saving…' : 'Save profile'}</button></div></form></section></>}
    {isClub && <section className="form-card password-card"><h2>Change password</h2><p>Replace the temporary password issued by central administration.</p><form className="event-form event-form-grid" onSubmit={submitPassword}><label className="field-wide"><span>Current password</span><input required minLength="8" type="password" autoComplete="current-password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} /></label><label><span>New password</span><input required minLength="8" type="password" autoComplete="new-password" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} /></label><label><span>Confirm new password</span><input required minLength="8" type="password" autoComplete="new-password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} /></label><div className="field-wide"><button className="button button-primary" disabled={Boolean(busy)}>{busy === 'password' ? 'Changing…' : 'Change password'}</button></div></form></section>}
  </main>
}
