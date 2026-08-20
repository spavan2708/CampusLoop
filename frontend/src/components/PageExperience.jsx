import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const titles = [
  [/^\/$/, 'CampusLoop — Campus events, all in one place'],
  [/signup/, 'Student signup — CampusLoop'], [/login/, 'Sign in — CampusLoop'],
  [/\/student\/events\/\d+/, 'Event details — CampusLoop'], [/\/student\/events/, 'Explore events — CampusLoop'],
  [/\/student\/registrations/, 'My registrations — CampusLoop'], [/\/student\/saved/, 'Saved events — CampusLoop'],
  [/\/student\/clubs/, 'Campus clubs — CampusLoop'], [/\/student\/profile/, 'Profile — CampusLoop'], [/^\/student$/, 'Student dashboard — CampusLoop'],
  [/\/club\/events\/new/, 'Create event — CampusLoop'], [/\/club\/events\/\d+\/edit/, 'Edit event — CampusLoop'],
  [/\/club\/events\/\d+\/attendees/, 'Event attendees — CampusLoop'], [/\/club\/events/, 'Manage events — CampusLoop'],
  [/\/club\/profile/, 'Club profile — CampusLoop'], [/^\/club$/, 'Club dashboard — CampusLoop'],
  [/\/admin\/clubs\/new/, 'Create club login — CampusLoop'], [/\/admin/, 'Central administration — CampusLoop'],
]

export default function PageExperience() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const [online, setOnline] = useState(() => navigator.onLine)
  const positions = useRef(new Map())
  const previousKey = useRef(location.key)
  useLayoutEffect(() => {
    positions.current.set(previousKey.current, window.scrollY)
    previousKey.current = location.key
    const saved = navigationType === 'POP' ? positions.current.get(location.key) : 0
    window.scrollTo({ top: saved || 0, behavior: 'instant' })
  }, [location.key, navigationType])
  useEffect(() => {
    document.title = titles.find(([pattern]) => pattern.test(location.pathname))?.[1] || 'CampusLoop'
  }, [location.pathname])
  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  return (
    <>
      <div key={location.key} className="route-progress route-progress-active" aria-hidden="true"><span /></div>
      {!online && <div className="network-banner" role="status">You are offline. Some CampusLoop actions will be unavailable until your connection returns.</div>}
    </>
  )
}
