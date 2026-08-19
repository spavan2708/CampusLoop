import { ArrowRight } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import Brand from '../components/Brand.jsx'
import useAuth from '../context/useAuth.js'

function PublicLayout() {
  const { user, loading } = useAuth()
  const dashboardPath = user ? `/${user.role}` : '/login'

  return (
    <div className="site-shell">
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
                <Link className="nav-link" to="/login">Log in</Link>
                <Link className="button button-primary button-small" to="/signup">Join CampusLoop</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  )
}

export default PublicLayout
