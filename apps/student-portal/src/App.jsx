import { CampusLoopMark, PortalStatus } from '@campusloop/shared-ui'

export default function App() {
  return <main className="student-shell"><header><a className="brand" href="/"><CampusLoopMark />CampusLoop</a><span>Student Portal</span></header><section className="student-hero"><div><p className="eyebrow">YOUR CAMPUS, IN THE LOOP</p><h1>Find the moments worth showing up for.</h1><p>Discover talks, workshops, festivals and communities across campus in one dedicated student experience.</p><div className="actions"><a className="primary" href="/login">Student login</a><a href="/signup">Create account</a></div></div><aside aria-label="Portal status"><PortalStatus>Student experience shell ready on port 5173</PortalStatus><strong>Discovery first.</strong><p>The current verified application remains available in the legacy frontend while routes are extracted in Checkpoint B.</p></aside></section></main>
}
