import { CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'

function Brand({ compact = false }) {
  return (
    <Link className="brand" to="/" aria-label="CampusLoop home">
      <span className="brand-mark" aria-hidden="true">
        <CalendarDays size={compact ? 19 : 22} strokeWidth={2.3} />
      </span>
      <span>CampusLoop</span>
    </Link>
  )
}

export default Brand
