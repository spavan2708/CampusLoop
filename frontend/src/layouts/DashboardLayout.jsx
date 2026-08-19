import { CalendarCheck2, Compass, House, LogOut, Menu, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand.jsx'
import useAuth from '../context/useAuth.js'

function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <Brand compact />
        {user.role === 'student' && <nav className={`dashboard-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Student navigation">
          <NavLink to="/student" end onClick={() => setMenuOpen(false)}><House /> Dashboard</NavLink>
          <NavLink to="/student/events" onClick={() => setMenuOpen(false)}><Compass /> Explore Events</NavLink>
          <NavLink to="/student/registrations" onClick={() => setMenuOpen(false)}><CalendarCheck2 /> My Registrations</NavLink>
          <NavLink to="/student/profile" onClick={() => setMenuOpen(false)}><UserRound /> Profile</NavLink>
        </nav>}
        <div className="dashboard-user">
          <div className="avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</div>
          <div className="user-copy"><strong>{user.name}</strong><span>{user.role}</span></div>
          <button className="icon-button" type="button" onClick={handleLogout} aria-label="Log out">
            <LogOut size={19} />
          </button>
          {user.role === 'student' && <button className="icon-button mobile-menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>}
        </div>
      </header>
      <Outlet />
    </div>
  )
}

export default DashboardLayout
