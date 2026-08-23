import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import EventCard from '../components/EventCard.jsx'
import LoadingState from '../components/LoadingState.jsx'
import useStudentData from '../context/useStudentData.js'
import { getApiErrorMessage } from '../services/errors.js'
import { getEvents } from '../services/events.js'

function EventsPage() {
  const { registrations } = useStudentData()
  const [filters, setFilters] = useState({ title: '', category: '', date: '', free: '', sort: '' })
  const [query, setQuery] = useState({ title: '', category: '', date: '', free: '', sort: '' })
  const [events, setEvents] = useState([])
  const [allCategories, setAllCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    getEvents(query, controller.signal).then((data) => {
      if (!active) return
      setEvents(data.items)
      // Set categories from API response if no prior filters; otherwise keep existing categories
      if (!query.title && !query.category && !query.date && !query.free && !query.sort) setAllCategories([...new Set(data.items.map((event) => event.category))].sort())
    }).catch((requestError) => { if (active && requestError.code !== 'ERR_CANCELED') setError(requestError) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [query])

  const categories = useMemo(() => allCategories.length ? allCategories : [...new Set(events.map((event) => event.category))].sort(), [allCategories, events])
  function runQuery(nextQuery) { setLoading(true); setError(''); setQuery(nextQuery) }
  function submit(event) { event.preventDefault(); runQuery(filters) }
  function clearFilters() { const empty = { title: '', category: '', date: '', free: '', sort: '' }; setFilters(empty); runQuery(empty) }

  return (
    <main className="dashboard-main student-page">
      <div className="page-heading"><span className="dashboard-kicker">Explore</span><h1>Find your next campus event</h1><p>Search published events and reserve your spot before registration closes.</p></div>
      <form className="filter-bar" onSubmit={submit} aria-label="Filter events">
        <label className="search-field"><Search size={19} /><span className="sr-only">Search by title</span><input value={filters.title} onChange={(event) => setFilters({ ...filters, title: event.target.value })} placeholder="Search by title" /></label>
        <label><span>Category</span><select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label><span>Date</span><input type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} /></label>
        <label><span>Free only</span><select value={filters.free} onChange={(event) => setFilters({ ...filters, free: event.target.value === 'true' })}><option value="">{'All'}</option><option value="true">Free only</option><option value="false">Paid only</option></select></label>
        <label><span>Sort</span><select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="">All sorts</option><option value="soonest">Soonest first</option><option value="newest">Newest first</option></select></label>
        <button className="button button-primary button-small" type="submit"><SlidersHorizontal size={17} /> Apply</button>
        {(query.title || query.category || query.date || query.free || query.sort) && <button className="button button-secondary button-small" type="button" onClick={clearFilters}><X size={16} /> Clear</button>}
      </form>
      {loading ? <LoadingState message="Finding events…" /> : error ? <ErrorState message={getApiErrorMessage(error, 'Could not load events.')} onRetry={() => runQuery({ ...query })} /> : events.length ? <div className="event-grid event-grid-page">{events.map((event) => <EventCard key={event.id} event={event} registered={registrations.some((item) => item.event.id === event.id)} />)}</div> : <EmptyState title="No events found" message="Try changing or clearing your filters." />}
    </main>
  )
}

export default EventsPage
