import { ArrowRight, Building2, CalendarCheck, CheckCircle2, Search, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getEvents } from '../services/events.js'
import { formatDateTime } from '../utils/events.js'

const benefits = [
  { icon: Search, title: 'Find what moves you', text: 'Discover talks, workshops, fests, and communities across campus.' },
  { icon: CalendarCheck, title: 'One-tap registration', text: 'Save your spot and keep every upcoming event in one clear view.' },
  { icon: Users, title: 'Built for organizers', text: 'Create memorable events and bring the right campus crowd together.' },
]

function LandingPage() {
  const [featured, setFeatured] = useState([])
  useEffect(() => { getEvents().then((data) => setFeatured(data.items.filter((event) => event.is_featured).concat(data.items.filter((event) => !event.is_featured)).slice(0, 2))).catch(() => setFeatured([])) }, [])
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
            <Link className="button button-primary" to="/student/signup">Student signup <ArrowRight size={18} /></Link>
            <Link className="button button-secondary" to="/login">I already have an account</Link>
          </div>
          <div className="trust-row">
            <span><CheckCircle2 size={16} /> Free for students</span>
            <span><CheckCircle2 size={16} /> Built for every club</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="A preview of CampusLoop events">
          <div className="floating-pill pill-one"><span /> Approved campus events</div>
          <div className="event-preview">
            <div className="preview-topline"><span className="preview-label">Happening soon</span><span className="preview-count">Live from CampusLoop</span></div>
            {featured.length ? featured.map((event, index) => <article className={`preview-event ${index ? 'preview-orange' : 'preview-purple'}`} key={event.id}><div className="date-tile"><strong>{new Date(event.event_date).getDate()}</strong><span>{new Date(event.event_date).toLocaleString(undefined, { month: 'short' })}</span></div><div><span className="event-tag">{event.category}</span><h3>{event.title}</h3><p>{event.venue} · {formatDateTime(event.event_date)}</p></div></article>) : <div className="landing-empty"><CalendarCheck /><p>Published events will appear here as clubs announce them.</p></div>}
            <div className="preview-footer"><div className="mini-avatars"><span>C</span><span>L</span></div><p>One trusted campus calendar</p></div>
          </div>
          <div className="floating-pill pill-two"><Users size={16} /> Clubs, students, one loop</div>
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
      <section className="workflow-section"><div className="section-heading"><span className="section-kicker">A clearer campus calendar</span><h2>From idea to full house.</h2><p>CampusLoop gives every role one focused workspace while central administration keeps the public calendar trusted.</p></div><div className="workflow-grid"><article><span>01</span><Search /><h3>Students discover</h3><p>Search approved events, save favourites, and see availability before registering.</p></article><article><span>02</span><Building2 /><h3>Clubs organize</h3><p>Create rich event pages, submit them for review, and manage attendees.</p></article><article><span>03</span><ShieldCheck /><h3>Admins moderate</h3><p>Provision club access and approve each event before it reaches students.</p></article></div></section>
      <section className="landing-cta"><div><span className="section-kicker">Ready when you are</span><h2>Put campus life in motion.</h2><p>Students can join directly. Club access is securely issued by central administration.</p></div><div><Link className="button button-primary" to="/student/signup">Create student account <ArrowRight /></Link><Link className="button button-secondary" to="/login">Open a portal</Link></div></section>
    </main>
  )
}

export default LandingPage
