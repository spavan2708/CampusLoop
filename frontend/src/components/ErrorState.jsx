import { CircleAlert, RefreshCw } from 'lucide-react'

function ErrorState({ message, onRetry }) {
  return (
    <div className="content-state content-state-error" role="alert">
      <CircleAlert />
      <h2>Something went wrong</h2>
      <p>{message}</p>
      {onRetry && <button className="button button-secondary button-small" type="button" onClick={onRetry}><RefreshCw size={16} /> Try again</button>}
    </div>
  )
}

export default ErrorState
