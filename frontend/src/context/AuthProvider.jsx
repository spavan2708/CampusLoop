import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentUser, loginUser } from '../services/auth.js'
import { AUTH_EXPIRED_EVENT, TOKEN_STORAGE_KEY } from '../services/api.js'
import AuthContext from './auth-context.js'

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionNotice, setSessionNotice] = useState('')

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setUser(null)
    setSessionNotice('')
  }, [])

  const clearSessionNotice = useCallback(() => setSessionNotice(''), [])

  useEffect(() => {
    let active = true

    async function restoreSession() {
      if (!localStorage.getItem(TOKEN_STORAGE_KEY)) {
        if (active) setLoading(false)
        return
      }
      try {
        const currentUser = await getCurrentUser()
        if (active) setUser(currentUser)
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      } finally {
        if (active) setLoading(false)
      }
    }

    restoreSession()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function handleExpiredSession() {
      setUser(null)
      setSessionNotice('Your session expired. Please sign in again to continue.')
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession)
  }, [])

  const login = useCallback(async (email, password, role) => {
    setSessionNotice('')
    const token = await loginUser(email, password, role)
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      return currentUser
    } catch (error) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      throw error
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, sessionNotice, clearSessionNotice }),
    [user, loading, login, logout, sessionNotice, clearSessionNotice],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
