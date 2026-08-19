import { LoaderCircle } from 'lucide-react'

function LoadingState({ message = 'Loading…' }) {
  return <div className="content-state" role="status"><LoaderCircle className="spin" /><p>{message}</p></div>
}

export default LoadingState
