import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import { getApiErrorMessage } from '../services/errors.js'

function LoginPage() {
  const { user, loading: authLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!authLoading && user) return <Navigate to={`/${user.role}`} replace />

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.email.trim() || !form.password) {
      setError('Enter both your email and password.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const currentUser = await login(form.email, form.password)
      const intendedPath = location.state?.from?.pathname
      const roleRoot = `/${currentUser.role}`
      const destination = intendedPath?.startsWith(roleRoot) ? intendedPath : roleRoot
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to log in. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-heading"><span className="auth-icon"><LockKeyhole size={22} /></span><h1>Welcome back</h1><p>Log in to see what’s happening around campus.</p></div>
        {location.state?.accountCreated && <div className="success-banner">Account created. You can log in now.</div>}
        {error && <div className="error-banner" role="alert">{error}</div>}
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

export default LoginPage
