import { LoaderCircle } from 'lucide-react'
import Brand from './Brand.jsx'

function FullPageLoader() {
  return (
    <main className="loading-screen" aria-live="polite" aria-busy="true">
      <Brand />
      <LoaderCircle className="spin" size={26} />
      <p>Restoring your CampusLoop session…</p>
    </main>
  )
}

export default FullPageLoader
