import { ArrowRight, Bookmark, CalendarCheck2, Compass, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return <main className="portal-landing">
    <section className="portal-hero">
      <div className="portal-hero-copy">
        <span className="hero-badge"><Sparkles /> Your campus, in the loop</span>
        <h1>Find the moments worth <em>showing up for.</em></h1>
        <p>Discover approved campus events, save what interests you, and keep every registration in one clear student experience.</p>
        <div className="hero-actions"><Link className="button button-primary" to="/login">Student login <ArrowRight /></Link><Link className="button button-secondary" to="/signup">Create account</Link></div>
      </div>
      <div className="portal-preview" aria-label="CampusLoop student features">
        <span className="dashboard-kicker">Student experience</span><h2>Everything you need to show up.</h2>
        <div><Compass /><span><strong>Discover</strong><small>Search approved events by title, category, and date.</small></span></div>
        <div><Bookmark /><span><strong>Save</strong><small>Keep interesting events close while you decide.</small></span></div>
        <div><CalendarCheck2 /><span><strong>Register</strong><small>Track confirmations, waitlists, and payment status.</small></span></div>
      </div>
    </section>
  </main>
}
