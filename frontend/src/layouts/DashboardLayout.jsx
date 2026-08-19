import { LogOut } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand.jsx'
import useAuth from '../context/useAuth.js'

function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <Brand compact />
        <div className="dashboard-user">
          <div className="avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</div>
          <div className="user-copy"><strong>{user.name}</strong><span>{user.role}</span></div>
          <button className="icon-button" type="button" onClick={handleLogout} aria-label="Log out">
            <LogOut size={19} />
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}

export default DashboardLayout
