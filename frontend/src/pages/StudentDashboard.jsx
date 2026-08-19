import { CalendarDays, Search, TicketCheck } from 'lucide-react'
import useAuth from '../context/useAuth.js'

function StudentDashboard() {
  const { user } = useAuth()
  return (
    <main className="dashboard-main">
      <div className="dashboard-welcome"><span className="dashboard-kicker">Student dashboard</span><h1>Welcome back, {user.name.split(' ')[0]}.</h1><p>Your campus calendar is about to get a lot more interesting.</p></div>
      <section className="placeholder-panel">
        <div className="placeholder-icon"><TicketCheck size={28} /></div>
        <div><h2>Your event hub is next</h2><p>Event discovery and your registrations will arrive in the next frontend phase.</p></div>
        <div className="placeholder-actions"><span><Search size={17} /> Browse events</span><span><CalendarDays size={17} /> My registrations</span></div>
      </section>
    </main>
  )
}

export default StudentDashboard
