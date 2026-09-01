import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getOutbox, getProof, getProofs, getTasks, initialiseStorage, putOutbox, putProof, putTask, removeOutbox } from './storage.js'
import { getNetworkAlertDuration, historyOrders, seedTasks, statusLabels } from './driverData.js'
import { IS_DEMO } from '../config/appMode.js'
import { changePassword } from '../auth/passwordLogin.js'
import { LanguageSwitcher } from '../i18n.jsx'
import './DriverApp.css'

const icons = {
  grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  cloud: <path d="M7.6 18h9a4.4 4.4 0 0 0 .4-8.8A5.5 5.5 0 0 0 6.5 8.5 4.8 4.8 0 0 0 7.6 18Z" />,
  user: <><circle cx="12" cy="8" r="3" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
  package: <><path d="m4 8 8-4 8 4-8 4-8-4Z" /><path d="M4 8v8l8 4 8-4V8M12 12v8" /></>,
  arrow: <path d="M5 12h13m-5-5 5 5-5 5" />,
  back: <path d="m15 5-7 7 7 7M9 12h10" />,
  camera: <><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" /><circle cx="12" cy="13" r="3.2" /></>,
  pen: <><path d="m5 19 1.3-4.4L16.8 4.1a1.8 1.8 0 0 1 2.6 2.6L8.9 18.3 5 19Z" /><path d="m14.8 6.2 3 3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4.2 4.2L19 6.5" />,
  refresh: <path d="M20 11a8 8 0 0 0-14.7-4L3 10m0 0V4m0 6h6M4 13a8 8 0 0 0 14.7 4L21 14m0 0v6m0-6h-6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  alert: <><path d="M12 4 21 20H3L12 4Z" /><path d="M12 9v5m0 3v.1" /></>,
  wifi: <><path d="M3.5 9.5a13 13 0 0 1 17 0M6.5 13a8.5 8.5 0 0 1 11 0M9.5 16.5a4 4 0 0 1 5 0" /><path d="M12 20h.01" /></>,
  location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
}

function Icon({ name }) {
  return <svg className="driver-icon" viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>
}

function getStatusClass(status) {
  if (status === 'synced') return 'is-complete'
  if (status === 'upload_pending' || status === 'proof_saved_local') return 'is-pending'
  return 'is-ready'
}

function formatRouteDate() {
  return new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
}

function StatusPill({ status }) {
  return <span className={`status-pill ${getStatusClass(status)}`}><span />{statusLabels[status] || status}</span>
}

function DriverHeader({ effectiveOnline, pendingCount, onSync, syncing, onOpenUserMenu }) {
  return <header className={`driver-header ${effectiveOnline ? 'online' : 'offline'}`}>
    <button type="button" className="driver-brand brand-menu-button" onClick={onOpenUserMenu} aria-label="Open menu"><span className="driver-logo">D</span><span>Done Safe <small>DRIVER</small></span></button>
    <div className="header-actions">
      <div className={`network-status ${effectiveOnline ? 'online' : 'offline'}`}><span className="network-dot" />{effectiveOnline ? 'Online' : 'Offline'}</div>
      <LanguageSwitcher />
      <button type="button" className="sync-button" onClick={onSync} disabled={!effectiveOnline || syncing} aria-label="Sync" title="Sync"><i className={`fa-solid ${syncing ? 'fa-spinner fa-spin' : 'fa-rotate'}`} aria-hidden="true" />{pendingCount ? <b>{pendingCount}</b> : null}</button>
      <button type="button" className="avatar-button" onClick={onOpenUserMenu} aria-label="Open user menu">JD</button>
    </div>
  </header>
}

function navigationLinks(task) {
  const [latitude, longitude] = task.coordinates || []
  const destination = `${latitude},${longitude}`
  return [
    { label: 'Google Maps', href: `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`, className: 'google' },
    { label: 'Waze', href: `https://waze.com/ul?ll=${destination}&navigate=yes`, className: 'waze' },
    { label: 'Apple Maps', href: `https://maps.apple.com/?daddr=${destination}&dirflg=d`, className: 'apple' },
  ]
}

function NavigationActions({ task }) {
  return <div className="navigation-actions">{navigationLinks(task).map((link) => <a key={link.label} className={link.className} href={link.href} target="_blank" rel="noreferrer">{link.label}</a>)}</div>
}

function RouteMap({ tasks, onSelectTask, effectiveOnline, expanded, onToggle }) {
  const mapElement = useRef(null)

  useEffect(() => {
    if (!expanded || !mapElement.current) return undefined
    const map = L.map(mapElement.current, { zoomControl: false, attributionControl: true }).setView([-33.8688, 151.2093], 12)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map)

    const mappedTasks = tasks.flatMap((task) => {
      const coordinates = Array.isArray(task.coordinates) ? task.coordinates.map(Number) : []
      return coordinates.length === 2 && coordinates.every(Number.isFinite) ? [{ ...task, coordinates }] : []
    })
    const routePoints = mappedTasks.map((task) => L.latLng(task.coordinates[0], task.coordinates[1]))
    mappedTasks.forEach((task, index) => {
      const marker = L.circleMarker(task.coordinates, { radius: 10, color: '#fff', weight: 3, fillColor: '#6252d9', fillOpacity: 1, bubblingMouseEvents: false }).addTo(map)
      marker.bindTooltip(String(index + 1), { permanent: true, direction: 'center', className: 'route-label', interactive: false, offset: [0, 0] })
      const popup = document.createElement('div')
      popup.className = 'map-popup'
      const name = document.createElement('strong')
      name.textContent = task.recipient
      const address = document.createElement('span')
      address.textContent = task.address
      const popupActions = document.createElement('div')
      popupActions.className = 'popup-navigation'
      navigationLinks(task).forEach((link) => {
        const anchor = document.createElement('a')
        anchor.href = link.href
        anchor.target = '_blank'
        anchor.rel = 'noreferrer'
        anchor.textContent = link.label.replace(' Maps', '')
        popupActions.appendChild(anchor)
      })
      const openButton = document.createElement('button')
      openButton.type = 'button'
      openButton.textContent = 'Open delivery'
      openButton.addEventListener('click', () => onSelectTask(task))
      popup.append(name, address, popupActions, openButton)
      marker.bindPopup(popup)
    })
    if (routePoints.length) map.fitBounds(L.latLngBounds(routePoints), { padding: [45, 45], maxZoom: 15 })
    requestAnimationFrame(() => map.invalidateSize())
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(mapElement.current)
    return () => { resizeObserver.disconnect(); map.remove() }
  }, [expanded, onSelectTask, tasks])

  return <section className={`route-map-card ${expanded ? 'is-expanded' : 'is-collapsed'}`} id="today-route"><button type="button" className="map-heading" onClick={onToggle} aria-expanded={expanded}><span><p className="driver-kicker">LIVE ROUTE VIEW</p><h2>Today’s delivery map</h2></span><span className="map-heading-action"><span><Icon name="map" /> {tasks.filter((task) => task.status !== 'synced').length} stops</span><Icon name="arrow" /></span></button>{expanded && <><div className="map-frame" ref={mapElement} />{!effectiveOnline && <div className="map-offline-note"><Icon name="cloud" /> Map tiles need a connection. Your delivery data remains available offline.</div>}<p className="map-attribution-note">Map data © OpenStreetMap contributors · Tap a pin to choose navigation.</p></>}</section>
}

function Sidebar({ view, setView, pendingCount }) {
  const items = [
    { key: 'dashboard', label: '今日任务', icon: 'grid' },
    { key: 'queue', label: '待同步', icon: 'cloud', count: pendingCount },
    { key: 'profile', label: '我的', icon: 'user' },
  ]
  return <aside className="driver-sidebar"><p className="side-label">WORKSPACE</p><nav>{items.map((item) => <button type="button" key={item.key} className={view === item.key ? 'active' : ''} onClick={() => setView(item.key)}><Icon name={item.icon} /><span>{item.label}</span>{item.count ? <b>{item.count}</b> : null}</button>)}</nav><div className="driver-side-footer"><div className="driver-avatar">JD</div><div><strong>Jordan Davis</strong><small>Driver · Sydney</small></div></div></aside>
}

function Dashboard({ tasks, pendingCount, onSelectTask, onSync, effectiveOnline, syncing, showConnectionAlert, onDismissAlert }) {
  const [mapExpanded, setMapExpanded] = useState(false)
  const activeTasks = tasks.filter((task) => task.status !== 'synced')
  const completed = tasks.filter((task) => task.status === 'synced').length
  return <div className="driver-content dashboard-view">
    <div className="dashboard-heading"><div><p className="driver-kicker">{formatRouteDate().toUpperCase()}</p><h1>Good morning, Jordan</h1><p>Here’s your route. You have <strong>{activeTasks.length} deliveries</strong> to complete.</p></div><button type="button" className="route-button" onClick={() => document.getElementById('today-route')?.scrollIntoView({ behavior: 'smooth' })}><Icon name="map" /> View route</button></div>
    {showConnectionAlert && <div className={`offline-banner connection-alert ${effectiveOnline ? 'alert-online' : 'alert-offline'}`} role="status" aria-live="polite"><div className="banner-icon"><Icon name={effectiveOnline ? 'wifi' : 'cloud'} /></div><div><strong>{effectiveOnline ? 'You are online' : 'You are offline'}</strong><p>{effectiveOnline ? pendingCount ? `${pendingCount} item${pendingCount > 1 ? 's' : ''} waiting to sync.` : 'New changes will sync automatically.' : 'Your work is safe on this device and will sync when you reconnect.'}</p></div><button type="button" className="alert-dismiss" onClick={onDismissAlert} aria-label="Dismiss connection alert"><Icon name="close" /></button>{effectiveOnline && pendingCount ? <button type="button" className="alert-action" onClick={onSync} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync now'}</button> : null}</div>}
    <div className="stat-row"><Stat label="Deliveries" value={tasks.length} icon="truck" /><Stat label="Completed" value={`${completed}/${tasks.length}`} icon="check" /></div>
    <div className="section-heading"><div><p className="driver-kicker">YOUR ROUTE</p><h2>Delivery list</h2></div><span className="list-date">{activeTasks.length} remaining</span></div>
    <div className="task-list">{tasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} onClick={() => onSelectTask(task)} />)}</div>
    <RouteMap tasks={tasks} onSelectTask={onSelectTask} effectiveOnline={effectiveOnline} expanded={mapExpanded} onToggle={() => setMapExpanded((value) => !value)} />
  </div>
}

function Stat({ label, value, icon }) {
  return <div className="stat-card"><span className="stat-icon"><Icon name={icon} /></span><div><span>{label}</span><strong>{value}</strong></div></div>
}

function TaskCard({ task, index, onClick }) {
  return <button type="button" className={`task-card ${task.status === 'synced' ? 'completed-card' : ''}`} onClick={onClick}>
    <div className="task-order"><span className="task-number">{String(index + 1).padStart(2, '0')}</span><span className="task-route-label">DELIVERY</span></div>
    <div className="task-main"><div className="task-title-row"><h3>{task.recipient}</h3>{task.priority === 'high' && <span className="priority-tag">Priority</span>}</div><p><Icon name="location" />{task.address}</p><span className="task-meta"><Icon name="package" />{task.packages} package{task.packages > 1 ? 's' : ''} <i /> {task.type}</span></div>
    <div className="task-action"><StatusPill status={task.status} /><Icon name="arrow" /></div>
  </button>
}

function DetailView({ task, proof, onBack, onSaved, effectiveOnline }) {
  const [recipient, setRecipient] = useState(proof?.recipientName || task.contact)
  const [note, setNote] = useState(proof?.note || '')
  const [exception, setException] = useState(proof?.exception || '')
  const [files, setFiles] = useState(() => (proof?.files || []).map((file) => ({ ...file, preview: file.blob ? URL.createObjectURL(file.blob) : file.preview })))
  const [hasSignature, setHasSignature] = useState(() => Boolean(proof?.files?.some((file) => file.type === 'signature')))
  const [signaturePreview, setSignaturePreview] = useState(() => proof?.files?.find((file) => file.type === 'signature')?.preview || '')
  const [signatureEditorOpen, setSignatureEditorOpen] = useState(false)
  const [message, setMessage] = useState('')
  const photoInput = useRef(null)
  const signatureRef = useRef(null)

  const addPhotos = (event) => {
    const newFiles = Array.from(event.target.files || []).map((file) => ({ id: `photo-${crypto.randomUUID()}`, type: 'photo', name: file.name, blob: file, preview: URL.createObjectURL(file) }))
    setFiles((current) => [...current, ...newFiles])
    if (newFiles.length) setException('')
    event.target.value = ''
  }

  const saveProof = async () => {
    let finalFiles = files
    if (!exception && !files.some((file) => file.type === 'signature') && signatureRef.current && signatureRef.current.hasInk()) {
      const blob = await signatureRef.current.toBlob()
      if (blob) finalFiles = [...finalFiles, { id: `signature-${crypto.randomUUID()}`, type: 'signature', name: 'signature.png', blob, preview: URL.createObjectURL(blob) }]
    }
    const hasEvidence = finalFiles.some((file) => file.type === 'photo' || file.type === 'signature')
    if (!hasEvidence && !exception) {
      setMessage('Add a photo or signature, or select an exception reason.')
      return
    }
    const proofId = proof?.id || `POD-${task.id}-${crypto.randomUUID().slice(0, 8)}`
    const savedProof = { id: proofId, taskId: task.id, recipientName: recipient, note, exception: hasEvidence ? '' : exception, capturedAtClient: new Date().toISOString(), files: finalFiles.map((file) => { const copy = { ...file }; delete copy.preview; return copy }), status: 'upload_pending' }
    await putProof(savedProof)
    await putOutbox({ id: `sync-${proofId}`, proofId, taskId: task.id, type: 'submit_proof', status: 'pending', attempts: 0, createdAt: new Date().toISOString() })
    await putTask({ ...task, status: 'upload_pending', updatedAt: new Date().toISOString() })
    setMessage(effectiveOnline ? 'Saved on device. Sync has been queued.' : 'Saved on device. It will sync when you reconnect.')
    window.setTimeout(() => onSaved(savedProof), 900)
  }

  return <div className="driver-content detail-view">
    <button type="button" className="back-button" onClick={onBack}><Icon name="back" /> Back to deliveries</button>
    <div className="detail-heading"><div><p className="driver-kicker">DELIVERY · {task.id}</p><h1>{task.recipient}</h1><p>{task.address}</p><NavigationActions task={task} /></div><StatusPill status={task.status} /></div>
    <div className="detail-grid">
      <div>
        <section className="detail-card evidence-card"><div className="detail-card-heading"><div><p className="driver-kicker">STEP 01</p><h2>Capture proof</h2></div><span className="required-label">Required</span></div><p className="card-help">Take at least one clear photo of the delivery. Photos are kept on this device while offline.</p><div className="photo-grid">{files.filter((file) => file.type === 'photo').map((file) => <div className="photo-preview" key={file.id}><img src={file.preview} alt="Delivery preview" /><button type="button" onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))} aria-label="Remove photo"><Icon name="close" /></button></div>)}<button type="button" className="add-photo" onClick={() => photoInput.current?.click()}><span><Icon name="camera" /></span><strong>Add photo</strong><small>Camera or gallery</small></button></div><input ref={photoInput} className="visually-hidden" type="file" accept="image/*" capture="environment" multiple onChange={addPhotos} /></section>
        <section className="detail-card signature-step" onClick={() => setSignatureEditorOpen(true)}><div className="detail-card-heading"><div><p className="driver-kicker">STEP 02</p><h2>Recipient signature</h2></div><span className="optional-label">Optional with photo</span></div><p className="card-help">Ask the recipient to sign inside the box. Use a finger on mobile.</p><SignatureCanvas ref={signatureRef} imageUrl={signaturePreview} onOpen={() => setSignatureEditorOpen(true)} onInkChange={(value) => { setHasSignature(value); if (value) setException(''); else { setSignaturePreview(''); setFiles((current) => current.filter((file) => file.type !== 'signature')) } }} /></section>
      </div>
      <div>
        <section className="detail-card form-card"><div className="detail-card-heading"><div><p className="driver-kicker">STEP 03</p><h2>Delivery details</h2></div></div><label className="driver-field"><span>Recipient name</span><input value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label><label className="driver-field"><span>Notes</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note about this delivery…" rows="4" /></label>{!files.some((file) => file.type === 'photo') && !hasSignature && <label className="driver-field exception-field"><span>Exception reason <small>Required when no photo or signature is provided</small></span><select value={exception} onChange={(event) => setException(event.target.value)} required><option value="">Select a reason</option><option value="recipient_unavailable">Recipient unavailable</option><option value="wrong_address">Wrong address</option><option value="damaged_item">Damaged item</option><option value="access_issue">Could not access location</option></select></label>}<div className="location-confirm"><Icon name="location" /><span><strong>Location captured</strong><small>Will be attached when synced</small></span><Icon name="check" /></div></section>
        <div className="save-panel"><div><span className="save-status"><span /> Local save enabled</span><p>{message || 'Your proof is saved locally before it is uploaded.'}</p></div><button type="button" className="complete-button" onClick={saveProof}><Icon name="check" /> Save & complete</button></div>
      </div>
    </div>
    {signatureEditorOpen && <SignatureEditor imageUrl={signaturePreview} onCancel={() => setSignatureEditorOpen(false)} onSave={async (blob) => { const preview = URL.createObjectURL(blob); const file = { id: `signature-${crypto.randomUUID()}`, type: 'signature', name: 'signature.png', blob, preview }; setFiles((current) => [...current.filter((item) => item.type !== 'signature'), file]); setSignaturePreview(preview); setHasSignature(true); setException(''); setSignatureEditorOpen(false) }} />}
  </div>
}

function SignatureEditor({ imageUrl, onCancel, onSave }) {
  const editorRef = useRef(null)
  useEffect(() => {
    document.documentElement.classList.add('signature-landscape')
    document.documentElement.requestFullscreen?.().catch(() => {})
    screen.orientation?.lock?.('landscape').catch(() => {})
    return () => { document.documentElement.classList.remove('signature-landscape'); screen.orientation?.unlock?.(); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}) }
  }, [])
  return <div className="signature-editor" role="dialog" aria-modal="true" aria-label="Full screen signature"><div className="signature-editor-bar"><button type="button" onClick={onCancel}><i className="fa-solid fa-arrow-left" /> Back</button><strong>Recipient signature</strong><button type="button" onClick={() => editorRef.current?.clear()}><i className="fa-solid fa-eraser" /> Clear</button></div><div className="signature-editor-canvas"><SignatureCanvas ref={editorRef} imageUrl={imageUrl} /></div><div className="signature-editor-footer"><button type="button" className="complete-button" onClick={async () => { const blob = await editorRef.current?.toBlob(); if (blob) onSave(blob) }}><i className="fa-solid fa-check" /> Save signature</button></div></div>
}

const SignatureCanvas = forwardRef(function SignatureCanvas({ onInkChange, onOpen, imageUrl }, ref) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const ink = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const bounds = canvas.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    canvas.width = bounds.width * ratio
    canvas.height = bounds.height * ratio
    const context = canvas.getContext('2d')
    context.scale(ratio, ratio)
    context.lineWidth = 2
    context.lineCap = 'round'
    context.strokeStyle = '#28313a'
    if (imageUrl) { const image = new Image(); image.onload = () => context.drawImage(image, 0, 0, bounds.width, bounds.height); image.src = imageUrl }
  }, [imageUrl])

  useImperativeHandle(ref, () => ({
    hasInk: () => ink.current,
    clear: () => { const canvas = canvasRef.current; canvas.getContext('2d').clearRect(0, 0, canvas.clientWidth, canvas.clientHeight); ink.current = false; onInkChange?.(false) },
    toBlob: () => new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/png')),
  }))

  const point = (event) => {
    const bounds = canvasRef.current.getBoundingClientRect()
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  }
  const start = (event) => { drawing.current = true; ink.current = true; onInkChange?.(true); const { x, y } = point(event); const context = canvasRef.current.getContext('2d'); context.beginPath(); context.moveTo(x, y); canvasRef.current.setPointerCapture(event.pointerId) }
  const move = (event) => { if (!drawing.current) return; const { x, y } = point(event); const context = canvasRef.current.getContext('2d'); context.lineTo(x, y); context.stroke() }
  const stop = () => { drawing.current = false }

  return <div className={`signature-wrap ${onOpen ? 'signature-openable' : ''}`} onClick={onOpen}><canvas ref={canvasRef} onPointerDown={onOpen ? (event) => { event.stopPropagation(); onOpen() } : start} onPointerMove={onOpen ? undefined : move} onPointerUp={onOpen ? undefined : stop} onPointerLeave={onOpen ? undefined : stop} /><span>{imageUrl ? 'Tap to edit signature' : 'Tap to sign'}</span><button type="button" onClick={(event) => { event.stopPropagation(); ref.current?.clear() }}>Clear</button></div>
})

function QueueView({ outbox, tasks, onSync, effectiveOnline, syncing, onSelectTask }) {
  return <div className="driver-content queue-view"><div className="queue-heading"><div><p className="driver-kicker">OUTBOX</p><h1>Waiting to sync</h1><p>Proofs saved on this device appear here until the server confirms them.</p></div><button type="button" className="outline-button" onClick={onSync} disabled={!effectiveOnline || !outbox.length || syncing}><Icon name="refresh" />{syncing ? 'Syncing…' : 'Sync now'}</button></div><div className="queue-summary"><div className="queue-summary-icon"><Icon name="cloud" /></div><div><strong>{outbox.length ? `${outbox.length} proof${outbox.length > 1 ? 's' : ''} waiting` : 'Everything is up to date'}</strong><p>{effectiveOnline ? 'You can continue working while these upload.' : 'Reconnect to upload your queued work.'}</p></div><span className={`queue-connection ${effectiveOnline ? 'online' : 'offline'}`}><span />{effectiveOnline ? 'Online' : 'Offline'}</span></div>{outbox.length ? <div className="queue-list">{outbox.map((item) => { const task = tasks.find((entry) => entry.id === item.taskId); return <button type="button" className="queue-item" key={item.id} onClick={() => task && onSelectTask(task)}><span className="queue-file"><Icon name="cloud" /></span><span><strong>{task?.recipient || item.taskId}</strong><small>{item.type === 'submit_proof' ? 'POD evidence package' : 'Pending action'} · Attempt {item.attempts + 1}</small></span><StatusPill status="upload_pending" /><Icon name="arrow" /></button> })}</div> : <div className="empty-queue"><div><Icon name="check" /></div><h2>No pending work</h2><p>New offline proofs will appear here.</p></div>}</div>
}

function ProfileView({ tasks, onSelectTask }) {
  const completedTasks = tasks.filter((task) => task.status === 'synced').map((task) => ({ ...task, date: '31 Aug 2026' }))
  const history = IS_DEMO ? [...completedTasks, ...historyOrders] : completedTasks

  return <div className="driver-content profile-view"><p className="driver-kicker">ACCOUNT</p><h1>My profile</h1><section className="profile-card"><div className="large-avatar">JD</div><div><h2>Jordan Davis</h2><p>Driver · Sydney region</p><span className="profile-status"><span /> Active</span></div></section><section className="history-section"><div className="history-heading"><div><p className="driver-kicker">ORDERS</p><h2>Delivery history</h2></div><span>{history.length} completed</span></div><div className="history-list">{history.map((order) => <button type="button" className="history-item" key={order.id} onClick={() => tasks.some((task) => task.id === order.id) && onSelectTask(tasks.find((task) => task.id === order.id))}><span className="history-check"><Icon name="check" /></span><span className="history-info"><strong>{order.recipient}</strong><small>{order.id} · {order.address}</small></span><span className="history-date">{order.date}</span><StatusPill status={order.status} /><Icon name="arrow" /></button>)}</div></section></div>
}

function PasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    if (newPassword.length < 6) { setMessage('New password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setMessage('New passwords do not match.'); return }
    setSaving(true)
    try {
      if (!IS_DEMO) await changePassword({ currentPassword, newPassword })
      setMessage('Password updated successfully.')
      window.setTimeout(onClose, 900)
    } catch (error) { setMessage(error.message || 'Unable to change password.') }
    finally { setSaving(false) }
  }
  return <div className="user-modal-backdrop"><section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="password-heading"><div className="user-modal-heading"><div><p className="driver-kicker">ACCOUNT</p><h2 id="password-heading">Change password</h2></div><button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button></div><form onSubmit={submit}><label className="driver-field"><span>Current password</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label><label className="driver-field"><span>New password</span><input type="password" minLength="6" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label><label className="driver-field"><span>Confirm new password</span><input type="password" minLength="6" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>{message && <p className="login-error" role="alert">{message}</p>}<div className="user-modal-actions"><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="complete-button" disabled={saving}>{saving ? 'Saving…' : 'Update password'}</button></div></form></section></div>
}

function DriverApp() {
  const [tasks, setTasks] = useState(IS_DEMO ? seedTasks : [])
  const [outbox, setOutbox] = useState([])
  const [view, setView] = useState('dashboard')
  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedProof, setSelectedProof] = useState(null)
  const [browserOnline, setBrowserOnline] = useState(() => navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [showConnectionAlert, setShowConnectionAlert] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [alertDuration] = useState(getNetworkAlertDuration)
  const effectiveOnline = browserOnline
  const logout = () => { sessionStorage.removeItem('pod-session'); window.location.href = '/login' }

  const refreshLocalState = useCallback(async () => {
    const [nextTasks, nextOutbox] = await Promise.all([getTasks(), getOutbox()])
    setTasks(nextTasks.length || !IS_DEMO ? nextTasks : seedTasks)
    setOutbox(nextOutbox)
  }, [])

  useEffect(() => {
    void initialiseStorage({ seedDemo: IS_DEMO }).then(refreshLocalState)
    const online = () => { setBrowserOnline(true); setShowConnectionAlert(true) }
    const offline = () => { setBrowserOnline(false); setShowConnectionAlert(true) }
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [refreshLocalState])

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowConnectionAlert(false), alertDuration * 1000)
    return () => window.clearTimeout(timeout)
  }, [alertDuration, effectiveOnline])

  const syncNow = useCallback(async () => {
    if (!effectiveOnline || syncing) return
    if (!IS_DEMO) return
    const queue = await getOutbox()
    if (!queue.length) return
    setSyncing(true)
    for (const item of queue) {
      await new Promise((resolve) => window.setTimeout(resolve, 650))
      const proof = await getProof(item.proofId)
      if (proof) await putProof({ ...proof, status: 'synced', syncedAt: new Date().toISOString() })
      const task = (await getTasks()).find((entry) => entry.id === item.taskId)
      if (task) await putTask({ ...task, status: 'synced', updatedAt: new Date().toISOString() })
      await removeOutbox(item.id)
    }
    await refreshLocalState()
    setSyncing(false)
  }, [effectiveOnline, refreshLocalState, syncing])

  useEffect(() => {
    if (effectiveOnline) window.setTimeout(() => { void syncNow() }, 0)
  }, [effectiveOnline, syncNow])

  const openTask = useCallback(async (task) => {
    setSelectedTask(task)
    setSelectedProof(await getProofs().then((items) => items.find((proof) => proof.taskId === task.id)))
    setView('detail')
  }, [])

  const onSaved = async () => {
    await refreshLocalState()
    setSelectedTask(null)
    setView('queue')
    if (effectiveOnline) void syncNow()
  }

  let page
  if (view === 'detail' && selectedTask) page = <DetailView task={selectedTask} proof={selectedProof} onBack={() => setView('dashboard')} onSaved={onSaved} effectiveOnline={effectiveOnline} />
  else if (view === 'queue') page = <QueueView outbox={outbox} tasks={tasks} onSync={syncNow} effectiveOnline={effectiveOnline} syncing={syncing} onSelectTask={openTask} />
  else if (view === 'profile') page = <ProfileView tasks={tasks} onSelectTask={openTask} />
  else page = <Dashboard tasks={tasks} pendingCount={outbox.length} onSelectTask={openTask} onSync={syncNow} effectiveOnline={effectiveOnline} syncing={syncing} showConnectionAlert={showConnectionAlert} onDismissAlert={() => setShowConnectionAlert(false)} />

  return <div className="driver-app"><DriverHeader effectiveOnline={effectiveOnline} pendingCount={outbox.length} onSync={syncNow} syncing={syncing} onOpenUserMenu={() => setUserMenuOpen((value) => !value)} /><div className="user-menu-wrap">{userMenuOpen && <div className="user-menu" role="menu"><strong>Jordan Davis</strong><small>Driver account</small><button type="button" onClick={() => { setPasswordModalOpen(true); setUserMenuOpen(false) }}>Change password</button><button type="button" onClick={logout}>Log out</button></div>}</div><div className="driver-shell"><Sidebar view={view} setView={setView} pendingCount={outbox.length} />{page}</div><nav className="mobile-nav">{[{ key: 'dashboard', label: '任务', icon: 'grid' }, { key: 'queue', label: '同步', icon: 'cloud' }, { key: 'profile', label: '我的', icon: 'user' }].map((item) => <button type="button" key={item.key} className={view === item.key ? 'active' : ''} onClick={() => setView(item.key)}><Icon name={item.icon} /><span>{item.label}</span>{item.key === 'queue' && outbox.length ? <b>{outbox.length}</b> : null}</button>)}</nav>{passwordModalOpen && <PasswordModal onClose={() => setPasswordModalOpen(false)} />}</div>
}

export default DriverApp
