import { Building2, GraduationCap, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

function LoginChooserPage() {
  return <main className="auth-page"><section className="role-entry"><span className="dashboard-kicker">Role-specific access</span><h1>How are you using CampusLoop?</h1><p>Choose the portal that matches your college role.</p><div className="portal-grid">
    <Link to="/student/login"><GraduationCap /><strong>Student</strong><span>Discover clubs, save events, and manage registrations.</span></Link>
    <Link to="/club/login"><Building2 /><strong>Club</strong><span>Manage your approved club profile, events, and attendees.</span></Link>
    <Link to="/admin/login"><ShieldCheck /><strong>Central Admin</strong><span>Review clubs, moderate events, and oversee CampusLoop.</span></Link>
  </div><p className="auth-switch">Club accounts are issued by the central administrator.</p></section></main>
}
export default LoginChooserPage
