import { Bookmark, CalendarCheck2, Compass, House, LogOut, Menu, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Brand from '../../../../frontend/src/components/Brand.jsx'
import ConfirmDialog from '../../../../frontend/src/components/ConfirmDialog.jsx'
import NotificationBell from '../../../../frontend/src/components/NotificationBell.jsx'
import useAuth from '../../../../frontend/src/context/useAuth.js'

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const close = () => setMenuOpen(false)

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return <div className="dashboard-shell">
    <header className="dashboard-header">
      <Brand compact />
      <nav className={`dashboard-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Student navigation">
        <NavLink to="/dashboard" end onClick={close}><House /> Dashboard</NavLink>
        <NavLink to="/events" onClick={close}><Compass /> Explore Events</NavLink>
        <NavLink to="/registrations" onClick={close}><CalendarCheck2 /> My Registrations</NavLink>
        <NavLink to="/saved" onClick={close}><Bookmark /> Saved</NavLink>
        <NavLink to="/profile" onClick={close}><UserRound /> Profile</NavLink>
      </nav>
      <div className="dashboard-user">
        <NotificationBell />
        <div className="avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</div>
        <div className="user-copy"><strong>{user.name}</strong><span>Student</span></div>
        <button className="icon-button" type="button" onClick={() => setLogoutOpen(true)} aria-label="Log out"><LogOut size={19} /></button>
        <button className="icon-button mobile-menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
      </div>
    </header>
    <Outlet />
    <ConfirmDialog open={logoutOpen} title="Log out of CampusLoop?" description="You will need to sign in again to access your registrations and saved events." confirmLabel="Log out" busy={false} onCancel={() => setLogoutOpen(false)} onConfirm={handleLogout} />
  </div>
}
