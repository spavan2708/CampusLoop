import { ImagePlus, LoaderCircle, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'

export default function ImageUploader({ label, description, imageUrl, aspect = 'wide', busy, onUpload }) {
  const input = useRef(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  async function process(file) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPG, PNG, or WebP image smaller than 5 MB.')
      return
    }
    setError('')
    await onUpload(file)
  }
  async function select(event) {
    await process(event.target.files?.[0])
    event.target.value = ''
  }
  return <div className={`image-uploader ${dragging ? 'is-dragging' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); process(event.dataTransfer.files?.[0]) }}>
    <div className={`image-preview image-${aspect}`}>{imageUrl ? <img loading="lazy" src={`${import.meta.env.VITE_API_URL}${imageUrl}`} alt={`${label} preview`} /> : <ImagePlus />}</div>
    <div><strong>{label}</strong><p>{description} Drag and drop here, or choose a file.</p>{error && <small role="alert">{error}</small>}<input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={select} /><button type="button" className="button button-secondary" disabled={busy} onClick={() => input.current?.click()}>{busy ? <><LoaderCircle className="spin" /> Uploading…</> : <><UploadCloud /> {imageUrl ? 'Replace image' : 'Choose image'}</>}</button></div>
  </div>
}
