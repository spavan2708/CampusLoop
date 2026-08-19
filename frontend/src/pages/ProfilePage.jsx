import { Mail, ShieldCheck, UserRound } from 'lucide-react'
import useAuth from '../context/useAuth.js'
import { formatDate } from '../utils/events.js'

function ProfilePage() {
  const { user } = useAuth()
  return <main className="dashboard-main student-page"><div className="page-heading"><span className="dashboard-kicker">Account</span><h1>Your profile</h1><p>Your CampusLoop student account details.</p></div><section className="profile-card"><div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div><div><h2>{user.name}</h2><span className="category-pill">Student</span></div><dl><div><UserRound /><dt>Name</dt><dd>{user.name}</dd></div><div><Mail /><dt>Email</dt><dd>{user.email}</dd></div><div><ShieldCheck /><dt>Member since</dt><dd>{formatDate(user.created_at)}</dd></div></dl></section></main>
}

export default ProfilePage
