import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'; import ErrorState from '../components/ErrorState.jsx'; import LoadingState from '../components/LoadingState.jsx'
import { getClubs } from '../services/clubs.js'
import { mediaUrl } from '../utils/media'

export default function ClubsPage({ publicView = false }) {
  const [clubs, setClubs] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null)
  useEffect(() => { getClubs().then(setClubs).catch(setError).finally(() => setLoading(false)) }, [])
  return <main className="dashboard-main student-page"><div className="page-heading"><span className="dashboard-kicker">Campus community</span><h1>Clubs directory</h1><p>Meet approved student communities and discover their events.</p></div>{loading ? <LoadingState /> : error ? <ErrorState message="Could not load clubs." /> : clubs.length ? <div className="club-grid">{clubs.map((club) => <article className="club-card" key={club.id}><div className="club-logo">{club.logo_url ? <img src={mediaUrl(club.logo_url)} alt={`${club.name} logo`} /> : club.name[0]}</div><span>{club.category}</span><h2>{club.name}</h2><p>{club.description}</p><Link className="text-link" to={`${publicView ? '/clubs' : '/student/clubs'}/${club.slug}`}>View club →</Link></article>)}</div> : <EmptyState title="No approved clubs yet" message="Approved clubs will appear here." />}</main>
}
