import { ArrowRight, CalendarCheck2, Send, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import Brand from '../../../../frontend/src/components/Brand.jsx'

export default function LandingPage() {
  return <main className="club-landing">
    <header className="club-public-header"><Brand compact /><nav aria-label="Club portal"><Link to="/apply">Request access</Link><Link className="button button-primary" to="/login">Club login</Link></nav></header>
    <section className="club-hero"><div><span className="club-eyebrow">CampusLoop for clubs</span><h1>Turn club ideas into approved campus experiences.</h1><p>Build complete event listings, send them through central review, and manage every attendee from one focused workspace.</p><div className="club-hero-actions"><Link className="button button-primary" to="/login">Continue to club login <ArrowRight /></Link><Link className="button button-secondary" to="/apply">How club access works</Link></div><small>Club credentials are securely issued by central administration.</small></div><aside aria-label="Publishing workflow"><span className="club-eyebrow">Your publishing desk</span><h2>A clear route to campus</h2><ol><li><CalendarCheck2 /><div><strong>Draft every detail</strong><span>Schedule, capacity, media, fees and instructions.</span></div></li><li><Send /><div><strong>Submit for review</strong><span>Track pending, changes requested, approved and rejected states.</span></div></li><li><ShieldCheck /><div><strong>Manage approved events</strong><span>Follow registrations and payment status.</span></div></li></ol></aside></section>
  </main>
}
