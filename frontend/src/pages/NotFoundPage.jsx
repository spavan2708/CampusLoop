import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <main className="status-page standalone-status">
      <div className="status-icon"><Compass size={30} /></div>
      <span className="status-code">404</span>
      <h1>Looks like you wandered off campus</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <Link className="button button-primary" to="/">Back to CampusLoop</Link>
    </main>
  )
}

export default NotFoundPage
