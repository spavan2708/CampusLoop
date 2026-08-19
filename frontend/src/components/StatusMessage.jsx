function StatusMessage({ type = 'success', children }) {
  if (!children) return null
  return <div className={`flash-message flash-${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div>
}

export default StatusMessage
