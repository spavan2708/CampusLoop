import { useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', tone = 'danger', reasonLabel, busy, onCancel, onConfirm }) {
  const [reason, setReason] = useState('')
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef(null)
  const previousFocus = useRef(null)
  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement
    const dialog = dialogRef.current
    const focusable = dialog?.querySelectorAll('button:not(:disabled), textarea, input, select, a[href]') || []
    focusable[reasonLabel ? 1 : 0]?.focus()
    const keydown = (event) => {
      if (event.key === 'Escape' && !busy) onCancel()
      if (event.key !== 'Tab' || !focusable.length) return
      const first = focusable[0]; const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    document.body.classList.add('dialog-open')
    return () => { document.removeEventListener('keydown', keydown); document.body.classList.remove('dialog-open'); previousFocus.current?.focus?.() }
  }, [open, busy, onCancel, reasonLabel])
  if (!open) return null
  const close = () => { setReason(''); onCancel() }
  const confirm = () => { onConfirm(reason.trim()); setReason('') }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && close()}>
    <section ref={dialogRef} className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <button className="dialog-close" onClick={close} disabled={busy} aria-label="Close"><X /></button>
      <div className={`dialog-icon dialog-${tone}`}><AlertTriangle /></div>
      <h2 id={titleId}>{title}</h2><p id={descriptionId}>{description}</p>
      {reasonLabel && <label><span>{reasonLabel}</span><textarea autoFocus rows="4" value={reason} onChange={(e) => setReason(e.target.value)} required /></label>}
      <div className="dialog-actions"><button className="button button-secondary" onClick={close} disabled={busy}>Go back</button><button className={`button ${tone === 'danger' ? 'button-danger' : 'button-primary'}`} onClick={confirm} disabled={busy || (reasonLabel && !reason.trim())}>{busy ? 'Working…' : confirmLabel}</button></div>
    </section>
  </div>
}
