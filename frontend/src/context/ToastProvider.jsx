import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import ToastContext from './toast-context.js'

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const dismiss = useCallback((id) => setToasts((items) => items.filter((item) => item.id !== id)), [])
  const showToast = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID()
    setToasts((items) => [...items, { id, message, type }])
    window.setTimeout(() => dismiss(id), 4500)
  }, [dismiss])
  const value = useMemo(() => ({ showToast }), [showToast])
  return <ToastContext.Provider value={value}>{children}<div className="toast-region" aria-live="polite" aria-atomic="false">{toasts.map((toast) => {
    const Icon = toast.type === 'error' ? CircleAlert : toast.type === 'info' ? Info : CheckCircle2
    return <div className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'} key={toast.id}><Icon /><span>{toast.message}</span><button onClick={() => dismiss(toast.id)} aria-label="Dismiss notification"><X /></button></div>
  })}</div></ToastContext.Provider>
}
