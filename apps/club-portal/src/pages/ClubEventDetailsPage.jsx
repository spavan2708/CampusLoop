import { ArrowLeft, CalendarDays, Clock3, Edit3, Eye, IndianRupee, MapPin, Send, UserRoundSearch, Users, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import ConfirmDialog from '../../../../frontend/src/components/ConfirmDialog.jsx'
import EmptyState from '../../../../frontend/src/components/EmptyState.jsx'
import ImageUploader from '../../../../frontend/src/components/ImageUploader.jsx'
import LoadingState from '../../../../frontend/src/components/LoadingState.jsx'
import StatusBadge from '../../../../frontend/src/components/StatusBadge.jsx'
import StatusMessage from '../../../../frontend/src/components/StatusMessage.jsx'
import useOrganizerData from '../../../../frontend/src/context/useOrganizerData.js'
import { getApiErrorMessage } from '../../../../frontend/src/services/errors.js'
import { uploadEventBanner, uploadEventPoster } from '../../../../frontend/src/services/events.js'
import { formatDateTime } from '../../../../frontend/src/utils/events.js'

export default function ClubEventDetailsPage() {
  const { eventId } = useParams()
  const location = useLocation()
  const { events, loading, publish, cancel, refresh } = useOrganizerData()
  const [busy, setBusy] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const [message, setMessage] = useState(location.state?.message ? { type: 'success', text: location.state.message } : null)
  const event = events.find((item) => item.id === Number(eventId))

  async function runAction() {
    const action = pendingAction; setPendingAction(null); setBusy(action); setMessage(null)
    try {
      await (action === 'submit' ? publish(event.id) : cancel(event.id))
      setMessage({ type: 'success', text: action === 'submit' ? 'Event submitted to central administration for approval.' : 'Event cancelled.' })
    } catch (error) { setMessage({ type: 'error', text: getApiErrorMessage(error, `Could not ${action} event.`) }) }
    finally { setBusy('') }
  }

  async function upload(kind, file) {
    setBusy(kind); setMessage(null)
    try {
      await (kind === 'poster' ? uploadEventPoster(event.id, file) : uploadEventBanner(event.id, file))
      await refresh()
      setMessage({ type: 'success', text: `${kind === 'poster' ? 'Poster' : 'Banner'} updated.` })
    } catch (error) { setMessage({ type: 'error', text: getApiErrorMessage(error, 'Could not upload this image.') }) }
    finally { setBusy('') }
  }

  if (loading) return <main className="dashboard-main"><LoadingState message="Loading event…" /></main>
  if (!event) return <main className="dashboard-main"><EmptyState title="Event not found" message="This event does not belong to your club account." actionLabel="Manage events" actionTo="/club/events" /></main>
  const editable = ['draft', 'rejected', 'changes_requested'].includes(event.status)
  const reviewCopy = event.status === 'pending_approval' ? 'Central administration is reviewing this event.' : event.status === 'approved' ? 'Approved and waiting for central administration to publish.' : event.status === 'rejected' ? 'Review the notification from central administration for the rejection reason, then edit and resubmit.' : event.status === 'changes_requested' ? 'Changes were requested. Review your notification, update the draft, and resubmit.' : ''

  return <><main className="dashboard-main student-page"><Link className="back-link" to="/club/events"><ArrowLeft /> Manage events</Link><StatusMessage type={message?.type}>{message?.text}</StatusMessage>{reviewCopy && <div className="review-status-note" role="status">{reviewCopy}</div>}<article className="event-detail-card"><div className="event-detail-hero"><div><span className="category-pill">{event.category}</span><h1>{event.title}</h1><p>{event.description}</p></div><StatusBadge value={event.status} /></div><div className="detail-grid"><div><CalendarDays /><span>Event date</span><strong>{formatDateTime(event.event_date)}</strong></div><div><Clock3 /><span>Registration deadline</span><strong>{formatDateTime(event.registration_deadline)}</strong></div><div><MapPin /><span>Venue</span><strong>{event.venue}</strong></div><div><Users /><span>Registrations</span><strong>{event.registered_count} of {event.capacity}</strong></div><div><Users /><span>Waitlist</span><strong>{event.waitlist_count}</strong></div><div><IndianRupee /><span>Entry</span><strong>{event.is_paid ? `₹${(event.entry_fee_paise / 100).toFixed(2)} · pay later` : 'Free'}</strong></div></div><div className="organizer-detail-actions"><Link className="button button-secondary" to={`/club/events/${event.id}/preview`}><Eye /> Preview</Link>{editable && <Link className="button button-secondary" to={`/club/events/${event.id}/edit`}><Edit3 /> Edit</Link>}{editable && <button className="button button-primary" disabled={Boolean(busy)} type="button" onClick={() => setPendingAction('submit')}><Send /> Submit for approval</button>}{event.status !== 'cancelled' && <button className="button button-danger" disabled={Boolean(busy)} type="button" onClick={() => setPendingAction('cancel')}><XCircle /> Cancel event</button>}<Link className="button button-secondary" to={`/club/events/${event.id}/attendees`}><UserRoundSearch /> Attendees</Link></div></article><section className="form-card"><div className="section-title-row"><div><span className="dashboard-kicker">Event media</span><h2>Poster and banner</h2><p>Upload JPG, PNG or WebP images up to 5 MB.</p></div></div><div className="media-grid"><ImageUploader label="Event poster" description="A square or portrait discovery image." imageUrl={event.poster_url} aspect="square" busy={busy === 'poster'} onUpload={(file) => upload('poster', file)} /><ImageUploader label="Event banner" description="A wide image for the detail page." imageUrl={event.banner_url} busy={busy === 'banner'} onUpload={(file) => upload('banner', file)} /></div></section></main><ConfirmDialog open={Boolean(pendingAction)} title={pendingAction === 'submit' ? 'Submit event for approval?' : 'Cancel this event?'} description={pendingAction === 'submit' ? 'The event becomes locked while central administration reviews it.' : 'Cancellation removes it from discovery and cannot be undone. This is not the same as leaving a draft.'} confirmLabel={pendingAction === 'submit' ? 'Submit for approval' : 'Cancel event'} tone={pendingAction === 'submit' ? 'primary' : 'danger'} busy={Boolean(busy)} onCancel={() => setPendingAction(null)} onConfirm={runAction} /></>
}
