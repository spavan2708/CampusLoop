import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../../../frontend/src/context/useAuth.js'
import { getApiErrorMessage } from '../../../../frontend/src/services/errors.js'

export default function LoginPage() {
  const { login, sessionNotice, clearSessionNotice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
    clearSessionNotice()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim()) || !form.password) {
      setError('Enter a valid email address and password.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const currentUser = await login(form.email, form.password, 'student')
      if (currentUser.role !== 'student') {
        localStorage.removeItem('campusloop_access_token')
        throw new Error('This portal is available to student accounts only.')
      }
      const intendedPath = location.state?.from?.pathname
      navigate(intendedPath?.startsWith('/') ? intendedPath : '/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.message === 'This portal is available to student accounts only.' ? requestError.message : getApiErrorMessage(requestError, 'Unable to log in. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-heading"><span className="auth-icon"><LockKeyhole size={22} /></span><h1>Student login</h1><p>Sign in to discover and manage your campus events.</p></div>
        {location.state?.accountCreated && <div className="success-banner" role="status">Account created. You can log in now.</div>}
        {(error || sessionNotice) && <div className="error-banner" role="alert">{error || sessionNotice}</div>}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email address</label>
          <div className="input-wrap"><Mail size={18} aria-hidden="true" /><input id="email" name="email" type="email" autoComplete="email" placeholder="you@college.edu" value={form.email} onChange={updateField} disabled={submitting} /></div>
          <label htmlFor="password">Password</label>
          <div className="input-wrap"><LockKeyhole size={18} aria-hidden="true" /><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={updateField} disabled={submitting} /><button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          <button className="button button-primary button-full" type="submit" disabled={submitting}>{submitting ? <><span className="button-spinner" /> Logging in…</> : <>Log in <ArrowRight size={18} /></>}</button>
        </form>
        <p className="auth-switch">New to CampusLoop? <Link to="/signup">Create an account</Link></p>
      </section>
    </main>
  )
}
