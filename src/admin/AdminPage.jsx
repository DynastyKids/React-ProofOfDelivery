import { useEffect, useMemo, useState } from 'react'
import { clearLoginFailures, getAccountSecurity } from '../auth/loginSecurity.js'
import { IS_DEMO } from '../config/appMode.js'
import { LanguageSwitcher } from '../i18n.jsx'
import './Admin.css'

const defaultDrivers = [
  { id: 'DRV-001', name: 'Jordan Davis', email: 'driver@pod.local', phone: '+61 400 123 456', status: 'Active', vehicle: 'VAN-042' },
  { id: 'DRV-002', name: 'Sofia Nguyen', email: 'sofia@pod.local', phone: '+61 400 222 801', status: 'Active', vehicle: 'VAN-018' },
  { id: 'DRV-003', name: 'Ethan Brooks', email: 'ethan@pod.local', phone: '+61 400 338 190', status: 'Invited', vehicle: 'Unassigned' },
]

const defaultVehicles = [
  { id: 'VAN-042', plate: 'NSW 42 POD', type: 'Transit van', status: 'In service', driver: 'Jordan Davis' },
  { id: 'VAN-018', plate: 'NSW 18 POD', type: 'Small van', status: 'In service', driver: 'Sofia Nguyen' },
  { id: 'TRK-007', plate: 'NSW 07 POD', type: 'Box truck', status: 'Available', driver: 'Unassigned' },
]

function loadCollection(key, fallback) {
  if (!IS_DEMO) return []
  try { const stored = JSON.parse(localStorage.getItem(key)); return Array.isArray(stored) ? stored : fallback } catch { return fallback }
}

function AdminIcon({ name }) {
  const paths = { grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>, users: <><circle cx="9" cy="8" r="3" /><path d="M3 19a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.8M17 13a5 5 0 0 1 4 4" /></>, truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>, settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6v-2.4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L7.4 8.6 9.1 7l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2.4h-.2a1.7 1.7 0 0 0-1.6 1Z" /></>, plus: <path d="M12 5v14M5 12h14" />, close: <path d="m6 6 12 12M18 6 6 18" />, check: <path d="m5 12 4.2 4.2L19 6.5" /> }
  return <svg className="admin-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function AdminPage() {
  const [section, setSection] = useState('overview')
  const [drivers, setDrivers] = useState(() => loadCollection('pod-admin-drivers', defaultDrivers))
  const [vehicles, setVehicles] = useState(() => loadCollection('pod-admin-vehicles', defaultVehicles))
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')

  const persist = (key, value) => { if (IS_DEMO) localStorage.setItem(key, JSON.stringify(value)) }
  const openAdd = (type) => { setForm(type === 'driver' ? { name: '', email: '', phone: '', vehicle: 'Unassigned' } : { plate: '', type: 'Transit van', driver: 'Unassigned' }); setModal(type) }
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const save = (event) => {
    event.preventDefault()
    if (!IS_DEMO) {
      setNotice('Production mode requires the Worker API to persist this change.')
      setModal(null)
      return
    }
    if (modal === 'driver') {
      const next = [...drivers, { ...form, id: `DRV-${String(drivers.length + 1).padStart(3, '0')}`, status: 'Invited' }]
      setDrivers(next); persist('pod-admin-drivers', next)
    } else {
      const next = [...vehicles, { ...form, id: `${form.type === 'Box truck' ? 'TRK' : 'VAN'}-${String(vehicles.length + 1).padStart(3, '0')}`, status: 'Available' }]
      setVehicles(next); persist('pod-admin-vehicles', next)
    }
    setModal(null)
  }

  const remove = (type, id) => {
    if (!IS_DEMO) { setNotice('Production mode requires the Worker API to persist this change.'); return }
    if (!window.confirm(`Delete this ${type}? This demo action cannot be undone.`)) return
    if (type === 'driver') { const next = drivers.filter((driver) => driver.id !== id); setDrivers(next); persist('pod-admin-drivers', next) }
    else { const next = vehicles.filter((vehicle) => vehicle.id !== id); setVehicles(next); persist('pod-admin-vehicles', next) }
  }

  const filteredDrivers = useMemo(() => drivers.filter((driver) => `${driver.name} ${driver.email} ${driver.id}`.toLowerCase().includes(search.toLowerCase())), [drivers, search])
  const filteredVehicles = useMemo(() => vehicles.filter((vehicle) => `${vehicle.plate} ${vehicle.type} ${vehicle.id}`.toLowerCase().includes(search.toLowerCase())), [vehicles, search])
  const session = JSON.parse(sessionStorage.getItem('pod-session') || '{}')

  return <div className="admin-app"><header className="admin-topbar"><a className="admin-brand" href="/admin"><span className="admin-logo">P</span><span>POD <small>OPERATIONS</small></span></a><div className="admin-topbar-right"><LanguageSwitcher /><span className="admin-mode">{IS_DEMO ? 'DEMO · ADMIN CONSOLE' : 'ADMIN CONSOLE'}</span><span className="admin-user">{session.name || 'Operations Admin'}</span><button type="button" className="logout-button" onClick={() => { sessionStorage.removeItem('pod-session'); window.location.href = '/login' }}>Log out</button></div></header><div className="admin-layout"><aside className="admin-sidebar"><p className="admin-nav-label">MANAGEMENT</p><button type="button" className={section === 'overview' ? 'active' : ''} onClick={() => setSection('overview')}><AdminIcon name="grid" /> Overview</button><button type="button" className={section === 'drivers' ? 'active' : ''} onClick={() => setSection('drivers')}><AdminIcon name="users" /> Drivers <b>{drivers.length}</b></button><button type="button" className={section === 'vehicles' ? 'active' : ''} onClick={() => setSection('vehicles')}><AdminIcon name="truck" /> Vehicles <b>{vehicles.length}</b></button><button type="button" className={section === 'accounts' ? 'active' : ''} onClick={() => setSection('accounts')}><AdminIcon name="settings" /> Accounts</button><button type="button" className="setup-nav" onClick={() => window.location.href = '/__setup'}><AdminIcon name="settings" /> Workspace setup</button></aside><main className="admin-main">{!IS_DEMO && <p className="security-notice"><AdminIcon name="settings" /><span>Production mode is active. Driver, vehicle and account data must be provided by the Worker API.</span></p>}{notice && <p className="security-success" role="status">{notice}</p>}{section === 'overview' ? <Overview drivers={drivers} vehicles={vehicles} onSection={setSection} /> : section === 'accounts' ? <AccountSecurity drivers={drivers} /> : <ManagementSection type={section} drivers={filteredDrivers} vehicles={filteredVehicles} search={search} setSearch={setSearch} onAdd={openAdd} onRemove={remove} />}</main></div>{modal && <Modal type={modal} form={form} update={update} onSave={save} onClose={() => setModal(null)} />}</div>
}

function Overview({ drivers, vehicles, onSection }) {
  return <div className="admin-content"><div className="admin-heading"><div><p className="admin-kicker">OPERATIONS</p><h1>Workspace overview</h1><p>Manage the people and vehicles that keep your delivery network moving.</p></div></div><div className="admin-stats"><AdminStat label="Active drivers" value={drivers.filter((driver) => driver.status === 'Active').length} icon="users" /><AdminStat label="Vehicles" value={vehicles.length} icon="truck" /><AdminStat label="Available vehicles" value={vehicles.filter((vehicle) => vehicle.status === 'Available').length} icon="grid" /></div><div className="quick-grid"><button type="button" onClick={() => onSection('drivers')}><span className="quick-icon purple"><AdminIcon name="users" /></span><span><strong>Manage drivers</strong><small>Add, remove and assign drivers</small></span><span>→</span></button><button type="button" onClick={() => onSection('vehicles')}><span className="quick-icon orange"><AdminIcon name="truck" /></span><span><strong>Manage vehicles</strong><small>Add, remove and track your fleet</small></span><span>→</span></button></div><div className="admin-note"><AdminIcon name="settings" /><p><strong>Next step</strong> Connect this console to the Worker API so driver and vehicle changes are persisted in MongoDB.</p></div></div>
}

function AdminStat({ label, value, icon }) { return <div className="admin-stat"><span><AdminIcon name={icon} /></span><div><small>{label}</small><strong>{value}</strong></div></div> }

function AccountSecurity({ drivers }) {
  const [now, setNow] = useState(() => Date.now())
  const [notice, setNotice] = useState('')
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const unlock = (email) => { if (IS_DEMO) { clearLoginFailures(email); setNotice(`${email} can try again now.`) } }
  if (!IS_DEMO) return <div className="admin-content"><div className="admin-heading"><div><p className="admin-kicker">SECURITY</p><h1>Account status</h1><p>Account lockout status is supplied by the Worker API in production mode.</p></div></div></div>
  return <div className="admin-content"><div className="admin-heading"><div><p className="admin-kicker">SECURITY</p><h1>Account status</h1><p>Monitor failed driver password attempts and release account cooldowns.</p></div></div><div className="security-notice"><AdminIcon name="settings" /><p>Password lockout is enforced after <strong>5 failed attempts</strong> and lasts <strong>15 minutes</strong>. A successful login also resets the counter.</p></div><div className="account-table"><div className="account-head"><span>Account</span><span>Attempts</span><span>State</span><span /></div>{drivers.map((driver) => { const security = getAccountSecurity(driver.email, now); const remaining = security.lockedUntil ? Math.max(0, security.lockedUntil - now) : 0; const locked = remaining > 0; return <div className="account-row" key={driver.id}><div className="entity-cell"><span className="entity-avatar">{driver.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{driver.name}</strong><small>{driver.email}</small></span></div><span className="attempt-count">{security.failedAttempts}/5</span><span className={`account-state ${locked ? 'locked' : security.failedAttempts ? 'warning' : 'normal'}`}><span />{locked ? `Cooling down · ${Math.ceil(remaining / 60000)} min` : security.failedAttempts ? 'Failed attempts' : 'Normal'}</span>{locked || security.failedAttempts ? <button type="button" className="unlock-button" onClick={() => unlock(driver.email)}>Unlock</button> : <span className="account-ok"><AdminIcon name="check" /></span>}</div> })}</div>{notice && <p className="security-success" role="status">{notice}</p>}</div>
}

function ManagementSection({ type, drivers, vehicles, search, setSearch, onAdd, onRemove }) {
  const isDriver = type === 'drivers'
  return <div className="admin-content"><div className="admin-heading management-heading"><div><p className="admin-kicker">{isDriver ? 'PEOPLE' : 'FLEET'}</p><h1>{isDriver ? 'Drivers' : 'Vehicles'}</h1><p>{isDriver ? 'Manage access and assignments for your delivery team.' : 'Keep track of the vehicles available to your drivers.'}</p></div><button type="button" className="admin-add-button" onClick={() => onAdd(isDriver ? 'driver' : 'vehicle')}><AdminIcon name="plus" /> Add {isDriver ? 'driver' : 'vehicle'}</button></div><div className="management-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${isDriver ? 'drivers' : 'vehicles'}…`} /><span>{isDriver ? drivers.length : vehicles.length} records</span></div>{isDriver ? <div className="management-table"><div className="table-head"><span>Driver</span><span>Contact</span><span>Assignment</span><span>Status</span><span /></div>{drivers.map((driver) => <div className="table-row" key={driver.id}><div className="entity-cell"><span className="entity-avatar">{driver.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{driver.name}</strong><small>{driver.id}</small></span></div><div><strong>{driver.email}</strong><small>{driver.phone}</small></div><div><span className="assignment">{driver.vehicle}</span></div><div><span className={`admin-status ${driver.status.toLowerCase()}`}><span />{driver.status}</span></div><button type="button" className="delete-button" onClick={() => onRemove('driver', driver.id)}><AdminIcon name="close" /></button></div>)}</div> : <div className="management-table"><div className="table-head vehicle-head"><span>Vehicle</span><span>Type</span><span>Assigned driver</span><span>Status</span><span /></div>{vehicles.map((vehicle) => <div className="table-row vehicle-row" key={vehicle.id}><div className="entity-cell"><span className="vehicle-icon"><AdminIcon name="truck" /></span><span><strong>{vehicle.plate}</strong><small>{vehicle.id}</small></span></div><div><strong>{vehicle.type}</strong></div><div><span className="assignment">{vehicle.driver}</span></div><div><span className={`admin-status ${vehicle.status === 'Available' ? 'active' : 'invited'}`}><span />{vehicle.status}</span></div><button type="button" className="delete-button" onClick={() => onRemove('vehicle', vehicle.id)}><AdminIcon name="close" /></button></div>)}</div>}</div>
}

function Modal({ type, form, update, onSave, onClose }) {
  const driver = type === 'driver'
  return <div className="modal-backdrop"><div className="admin-modal"><div className="modal-heading"><div><p className="admin-kicker">NEW RECORD</p><h2>Add {driver ? 'driver' : 'vehicle'}</h2></div><button type="button" className="modal-close" onClick={onClose}><AdminIcon name="close" /></button></div><form onSubmit={onSave}>{driver ? <><label>Name<input value={form.name} onChange={update('name')} placeholder="Full name" required /></label><label>Work email<input type="email" value={form.email} onChange={update('email')} placeholder="driver@company.com" required /></label><label>Phone<input value={form.phone} onChange={update('phone')} placeholder="+61 …" required /></label><label>Vehicle assignment<select value={form.vehicle} onChange={update('vehicle')}><option>Unassigned</option><option>VAN-042</option><option>VAN-018</option><option>TRK-007</option></select></label></> : <><label>Registration plate<input value={form.plate} onChange={update('plate')} placeholder="NSW 00 POD" required /></label><label>Vehicle type<select value={form.type} onChange={update('type')}><option>Transit van</option><option>Small van</option><option>Box truck</option></select></label><label>Assign driver<input value={form.driver} onChange={update('driver')} placeholder="Unassigned" /></label></>}<div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button type="submit" className="admin-save-button">Add {driver ? 'driver' : 'vehicle'}</button></div></form></div></div>
}

export default AdminPage
