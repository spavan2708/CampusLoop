import { CalendarX2 } from 'lucide-react'
import { Link } from 'react-router-dom'

function EmptyState({ title, message, actionLabel, actionTo }) {
  return (
    <div className="content-state">
      <CalendarX2 />
      <h2>{title}</h2>
      <p>{message}</p>
      {actionTo && <Link className="button button-primary button-small" to={actionTo}>{actionLabel}</Link>}
    </div>
  )
}

export default EmptyState
