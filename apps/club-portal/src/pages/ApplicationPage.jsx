import { ArrowLeft, Building2, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import Brand from '../../../../frontend/src/components/Brand.jsx'

export default function ApplicationPage() {
  return <main className="club-landing"><header className="club-public-header"><Brand compact /><Link to="/login">Club login</Link></header><section className="club-access-page"><Link className="back-link" to="/"><ArrowLeft /> Back home</Link><div className="access-card"><span className="access-icon"><Building2 /></span><span className="club-eyebrow">Club access</span><h1>Ask central administration to create your club workspace.</h1><p>CampusLoop does not currently expose public club applications. This protects the official club directory: the central administrator verifies a club, creates its profile and issues its first login.</p><div className="access-step"><ShieldCheck /><div><strong>After your login is issued</strong><span>Sign in here, complete the public club profile, upload branding, and immediately replace the temporary password from Profile.</span></div></div><Link className="button button-primary" to="/login">I already have club credentials <ArrowLeft className="arrow-forward" /></Link></div></section></main>
}
