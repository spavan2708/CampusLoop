import { CalendarPlus, LayoutDashboard, Users } from 'lucide-react'
import useAuth from '../context/useAuth.js'

function OrganizerDashboard() {
  const { user } = useAuth()
  return (
    <main className="dashboard-main">
      <div className="dashboard-welcome"><span className="dashboard-kicker">Organizer dashboard</span><h1>Let’s make something memorable, {user.name.split(' ')[0]}.</h1><p>Your organizer workspace is ready for its event tools.</p></div>
      <section className="placeholder-panel organizer-panel">
        <div className="placeholder-icon"><LayoutDashboard size={28} /></div>
        <div><h2>Event management is coming next</h2><p>Creation, publishing, editing, and attendee tools will live here.</p></div>
        <div className="placeholder-actions"><span><CalendarPlus size={17} /> Create event</span><span><Users size={17} /> View attendees</span></div>
      </section>
    </main>
  )
}

export default OrganizerDashboard
