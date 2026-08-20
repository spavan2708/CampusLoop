import { LogOut, ShieldAlert } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../../../../frontend/src/context/useAuth.js'

export default function UnauthorizedPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  function switchAccount() { logout(); navigate('/login', { replace: true }) }
  return <main className="centered-page"><section className="message-card"><ShieldAlert /><span className="dashboard-kicker">Student access only</span><h1>This account cannot use the Student Portal</h1><p>{user ? `You are signed in as ${user.role.replace('_', ' ')}. Use the matching CampusLoop portal or switch accounts.` : 'Sign in with an active student account to continue.'}</p>{user ? <button className="button button-primary" type="button" onClick={switchAccount}><LogOut /> Switch account</button> : <Link className="button button-primary" to="/login">Student login</Link>}</section></main>
}
