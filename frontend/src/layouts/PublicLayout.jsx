import { ArrowRight } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import Brand from '../components/Brand.jsx'
import useAuth from '../context/useAuth.js'

function PublicLayout() {
  const { user, loading, sessionNotice, clearSessionNotice } = useAuth()
  const dashboardPath = user ? ({ student: '/student', club_admin: '/club', central_admin: '/admin' }[user.role] || '/login') : '/login'

  return (
    <div className="site-shell">
      {sessionNotice && (
        <div className="session-banner" role="alert">
          <span>{sessionNotice}</span>
          <button type="button" onClick={clearSessionNotice} aria-label="Dismiss session message">Dismiss</button>
        </div>
      )}
      <header className="public-header">
        <div className="header-inner">
          <Brand />
          <nav className="public-nav" aria-label="Primary navigation">
            {!loading && user ? (
              <Link className="button button-primary button-small" to={dashboardPath}>
                Dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link className="nav-link" to="/login">Choose portal</Link>
                <Link className="button button-primary button-small" to="/student/signup">Student signup</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer"><Brand compact /><p>One trusted place for campus events.</p><nav aria-label="Portal links"><Link to="/student/login">Student login</Link><Link to="/club/login">Club login</Link><Link to="/admin/login">Administration</Link></nav><span>© {new Date().getFullYear()} CampusLoop</span></footer>
    </div>
  )
}

export default PublicLayout
