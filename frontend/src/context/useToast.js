import { useContext } from 'react'
import ToastContext from './toast-context.js'

export default function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used within ToastProvider')
  return value
}
