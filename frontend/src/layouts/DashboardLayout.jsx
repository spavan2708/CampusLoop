import { Bookmark, Building2, CalendarCheck2, CalendarPlus, Compass, House, ListChecks, LogOut, Menu, ShieldCheck, UserPlus, UserRound, Users, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand.jsx'
import useAuth from '../context/useAuth.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import NotificationBell from '../components/NotificationBell.jsx'

function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

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
          <NavLink to="/student/saved" onClick={() => setMenuOpen(false)}><Bookmark /> Saved</NavLink>
          <NavLink to="/student/clubs" onClick={() => setMenuOpen(false)}><Building2 /> Clubs</NavLink>
          <NavLink to="/student/profile" onClick={() => setMenuOpen(false)}><UserRound /> Profile</NavLink>
        </nav>}
        {user.role === 'central_admin' && <nav className={`dashboard-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Central administration navigation"><NavLink to="/admin" end onClick={() => setMenuOpen(false)}><House /> Dashboard</NavLink><NavLink to="/admin/clubs" onClick={() => setMenuOpen(false)}><Building2 /> Clubs</NavLink><NavLink to="/admin/events" onClick={() => setMenuOpen(false)}><ShieldCheck /> Events</NavLink><NavLink to="/admin/users" onClick={() => setMenuOpen(false)}><Users /> Users</NavLink><NavLink to="/admin/clubs/new" onClick={() => setMenuOpen(false)}><UserPlus /> New Club</NavLink><NavLink to="/admin/profile" onClick={() => setMenuOpen(false)}><UserRound /> Profile</NavLink></nav>}
        {user.role === 'club_admin' && <nav className={`dashboard-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Organizer navigation">
          <NavLink to="/club" end onClick={() => setMenuOpen(false)}><House /> Dashboard</NavLink>
          <NavLink to="/club/events" onClick={() => setMenuOpen(false)}><ListChecks /> Manage Events</NavLink>
          <NavLink to="/club/events/new" onClick={() => setMenuOpen(false)}><CalendarPlus /> Create Event</NavLink>
          <NavLink to="/club/profile" onClick={() => setMenuOpen(false)}><UserRound /> Profile</NavLink>
        </nav>}
        <div className="dashboard-user">
          <NotificationBell />
          <div className="avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</div>
          <div className="user-copy"><strong>{user.name}</strong><span>{user.role.replace('_', ' ')}</span></div>
          <button className="icon-button" type="button" onClick={() => setLogoutOpen(true)} aria-label="Log out">
            <LogOut size={19} />
          </button>
          <button className="icon-button mobile-menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>
      <Outlet />
      <ConfirmDialog open={logoutOpen} title="Log out of CampusLoop?" description="You will need to sign in again to access this portal." confirmLabel="Log out" busy={false} onCancel={() => setLogoutOpen(false)} onConfirm={handleLogout} />
    </div>
  )
}

export default DashboardLayout
