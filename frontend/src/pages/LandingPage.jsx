import { ArrowRight, CalendarCheck, CheckCircle2, Search, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

const benefits = [
  { icon: Search, title: 'Find what moves you', text: 'Discover talks, workshops, fests, and communities across campus.' },
  { icon: CalendarCheck, title: 'One-tap registration', text: 'Save your spot and keep every upcoming event in one clear view.' },
  { icon: Users, title: 'Built for organizers', text: 'Create memorable events and bring the right campus crowd together.' },
]

function LandingPage() {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="hero-content">
          <div className="eyebrow"><Sparkles size={15} /> Your campus, in the loop</div>
          <h1>Every campus moment,<br /><span>all in one place.</span></h1>
          <p className="hero-lead">Discover events worth showing up for. CampusLoop connects students and organizers through one simple, vibrant campus hub.</p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/signup">Create your account <ArrowRight size={18} /></Link>
            <Link className="button button-secondary" to="/login">I already have an account</Link>
          </div>
          <div className="trust-row">
            <span><CheckCircle2 size={16} /> Free for students</span>
            <span><CheckCircle2 size={16} /> Built for every club</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="A preview of CampusLoop events">
          <div className="floating-pill pill-one"><span /> Registration open</div>
          <div className="event-preview">
            <div className="preview-topline"><span className="preview-label">Happening soon</span><span className="preview-count">12 events</span></div>
            <article className="preview-event preview-purple">
              <div className="date-tile"><strong>20</strong><span>SEP</span></div>
              <div><span className="event-tag">Technology</span><h3>Campus Tech Fest</h3><p>Main Auditorium · 10:00 AM</p></div>
            </article>
            <article className="preview-event preview-orange">
              <div className="date-tile"><strong>24</strong><span>SEP</span></div>
              <div><span className="event-tag">Community</span><h3>Ideas After Hours</h3><p>Innovation Lab · 5:30 PM</p></div>
            </article>
            <div className="preview-footer"><div className="mini-avatars"><span>P</span><span>A</span><span>R</span></div><p>Join your campus community</p></div>
          </div>
          <div className="floating-pill pill-two"><Users size={16} /> 148 students joined</div>
        </div>
      </section>

      <section className="benefits-section">
        <div className="section-heading"><span className="section-kicker">Made for campus life</span><h2>Less searching. More showing up.</h2></div>
        <div className="benefit-grid">
          {benefits.map(({ icon: Icon, title, text }) => (
            <article className="benefit-card" key={title}>
              <div className="benefit-icon"><Icon size={22} /></div><h3>{title}</h3><p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default LandingPage
