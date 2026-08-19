import { ShieldX } from 'lucide-react'
import { Link } from 'react-router-dom'
import useAuth from '../context/useAuth.js'

function UnauthorizedPage() {
  const { user } = useAuth()
  return (
    <main className="status-page">
      <div className="status-icon"><ShieldX size={30} /></div>
      <span className="status-code">403</span>
      <h1>This space belongs to another role</h1>
      <p>Your account doesn’t have permission to open that dashboard.</p>
      <Link className="button button-primary" to={user ? `/${user.role}` : '/login'}>Go to my dashboard</Link>
    </main>
  )
}

export default UnauthorizedPage
