import { ArrowRight } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import Brand from '../../../../frontend/src/components/Brand.jsx'
import useAuth from '../../../../frontend/src/context/useAuth.js'

export default function PublicLayout() {
  const { user, loading, sessionNotice, clearSessionNotice } = useAuth()
  const student = user?.role === 'student'

  return <div className="site-shell">
    {sessionNotice && <div className="session-banner" role="alert"><span>{sessionNotice}</span><button type="button" onClick={clearSessionNotice}>Dismiss</button></div>}
    <header className="public-header"><div className="header-inner">
      <Brand />
      <nav className="public-nav" aria-label="Student portal navigation">
        {!loading && student
          ? <Link className="button button-primary button-small" to="/dashboard">Dashboard <ArrowRight size={16} /></Link>
          : <><Link className="nav-link" to="/login">Student login</Link><Link className="button button-primary button-small" to="/signup">Create account</Link></>}
      </nav>
    </div></header>
    <Outlet />
    <footer className="site-footer"><Brand compact /><p>Your campus, in the loop.</p><nav aria-label="Student links"><Link to="/events">Explore events</Link><Link to="/login">Student login</Link><Link to="/signup">Create account</Link></nav><span>© {new Date().getFullYear()} CampusLoop</span></footer>
  </div>
}
