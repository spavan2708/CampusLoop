import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

import NavigationGuardContext from './navigation-guard-context.js'

export default function NavigationGuardProvider({ children }) {
  const navigate = useNavigate()
  const guard = useRef({ dirty: false, message: '' })
  const [pending, setPending] = useState(null)
  const register = useCallback((dirty, message) => {
    guard.current = { dirty, message }
    return () => { guard.current = { dirty: false, message: '' } }
  }, [])
  const requestNavigation = useCallback((path, options) => {
    if (!guard.current.dirty) return navigate(path, options)
    setPending({ path, message: guard.current.message })
  }, [navigate])
  useEffect(() => {
    const beforeUnload = (event) => {
      if (!guard.current.dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    const interceptLinks = (event) => {
      const anchor = event.target.closest?.('a[href]')
      if (!anchor || !guard.current.dirty || event.defaultPrevented || event.metaKey || event.ctrlKey || anchor.target === '_blank') return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin || `${url.pathname}${url.search}` === `${window.location.pathname}${window.location.search}`) return
      event.preventDefault()
      setPending({ path: `${url.pathname}${url.search}${url.hash}`, message: guard.current.message })
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', interceptLinks, true)
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', interceptLinks, true) }
  }, [])
  const value = useMemo(() => ({ register, requestNavigation }), [register, requestNavigation])
  return <NavigationGuardContext.Provider value={value}>{children}<ConfirmDialog open={Boolean(pending)} title="Discard unsaved changes?" description={pending?.message} confirmLabel="Discard and leave" busy={false} onCancel={() => setPending(null)} onConfirm={() => { const path = pending.path; guard.current = { dirty: false, message: '' }; setPending(null); navigate(path) }} /></NavigationGuardContext.Provider>
}
