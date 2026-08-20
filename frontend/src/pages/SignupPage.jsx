import { ArrowRight, UserRoundPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import { signupUser } from '../services/auth.js'
import { getApiErrorMessage } from '../services/errors.js'

const initialForm = { name: '', email: '', password: '', confirmPassword: '' }

function SignupPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!authLoading && user) return <Navigate to={user.role === 'club_admin' ? '/club' : user.role === 'central_admin' ? '/admin' : '/student'} replace />

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
  }

  function validate() {
    if (form.name.trim().length < 2) return 'Enter your full name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Enter a valid email address.'
    if (form.password.length < 8) return 'Password must contain at least 8 characters.'
    if (form.password !== form.confirmPassword) return 'Passwords do not match.'
    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await signupUser({ name: form.name, email: form.email, password: form.password })
      navigate('/student/login', { replace: true, state: { accountCreated: true } })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to create your account.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page auth-page-signup">
      <section className="auth-card auth-card-wide">
        <div className="auth-heading"><span className="auth-icon"><UserRoundPlus size={22} /></span><h1>Join CampusLoop</h1><p>One account for everything happening on campus.</p></div>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="form-group"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" placeholder="Your full name" value={form.name} onChange={updateField} disabled={submitting} /></div>
            <div className="form-group"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@college.edu" value={form.email} onChange={updateField} disabled={submitting} /></div>
            <div className="form-group"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={updateField} disabled={submitting} /></div>
            <div className="form-group"><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Repeat your password" value={form.confirmPassword} onChange={updateField} disabled={submitting} /></div>
          </div>
          <button className="button button-primary button-full" type="submit" disabled={submitting}>{submitting ? <><span className="button-spinner" /> Creating account…</> : <>Create account <ArrowRight size={18} /></>}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/student/login">Student login</Link></p>
      </section>
    </main>
  )
}

export default SignupPage
