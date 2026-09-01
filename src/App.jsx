import { useState } from 'react'
import AdminPage from './admin/AdminPage.jsx'
import LoginPage from './auth/LoginPage.jsx'
import { registerPasskey } from './auth/passkey.js'
import DriverApp from './driver/DriverApp.jsx'
import './App.css'
import { LanguageSwitcher } from './i18n.jsx'

const savedNetworkAlertDuration = typeof window !== 'undefined' ? window.localStorage.getItem('pod-network-alert-duration') : null

const initialForm = {
  adminName: 'Operations Admin',
  adminEmail: '',
  adminPassword: '',
  accountId: '',
  bucketName: '',
  accessKeyId: '',
  secretAccessKey: '',
  mongoUri: '',
  databaseName: 'pod',
  collectionName: 'orders',
  mailFrom: '',
  smtpHost: '',
  smtpPort: '587',
  smtpUsername: '',
  smtpPassword: '',
  imapHost: '',
  imapPort: '993',
  imapUsername: '',
  imapPassword: '',
  timezone: 'Australia/Sydney',
  networkAlertDuration: savedNetworkAlertDuration || '3',
}

function Icon({ name }) {
  const paths = {
    shield: <path d="M12 3 5 6v5c0 4.4 2.9 7.5 7 9 4.1-1.5 7-4.6 7-9V6l-7-3Zm-3.2 8.8 2 2 4.5-4.5" />,
    cloud: <path d="M7.6 18h9a4.4 4.4 0 0 0 .4-8.8A5.5 5.5 0 0 0 6.5 8.5 4.8 4.8 0 0 0 7.6 18Z" />,
    database: <><ellipse cx="12" cy="5.5" rx="6.5" ry="2.5" /><path d="M5.5 5.5v6c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-6M5.5 11.5v6c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-6" /></>,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    eye: <><path d="M2.5 12s3.2-5 9.5-5 9.5 5 9.5 5-3.2 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.3" /></>,
    arrow: <path d="M5 12h13m-5-5 5 5-5 5" />,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  }

  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function Field({ label, hint, required = false, ...props }) {
  return (
    <label className="field">
      <span>{label}{required && <em> *</em>}</span>
      <input {...props} required={required} />
      {hint && <small>{hint}</small>}
    </label>
  )
}

function SecretField({ label, value, onChange, placeholder, hint, required = false, minLength }) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="field">
      <span>{label}{required && <em> *</em>}</span>
      <div className="secret-input">
        <input type={visible ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} autoComplete="new-password" required={required} minLength={minLength} />
        <button type="button" className="icon-button" onClick={() => setVisible(!visible)} aria-label={visible ? '隐藏内容' : '显示内容'}><Icon name="eye" /></button>
      </div>
      {hint && <small>{hint}</small>}
    </label>
  )
}

function Step({ number, title, detail, active, complete }) {
  return (
    <div className={`step ${active ? 'active' : ''} ${complete ? 'complete' : ''}`}>
      <span className="step-number">{complete ? <Icon name="check" /> : number}</span>
      <span><strong>{title}</strong><small>{detail}</small></span>
    </div>
  )
}

function SetupPage() {
  const [form, setForm] = useState(initialForm)
  const [showReview, setShowReview] = useState(false)
  const [saveState, setSaveState] = useState('idle')
  const [testState, setTestState] = useState({ cloudflare: 'idle', mongodb: 'idle', email: 'idle' })
  const [passkeyState, setPasskeyState] = useState('idle')

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setSaveState('idle')
  }

  const testConnection = (service) => {
    setTestState((current) => ({ ...current, [service]: 'testing' }))
    window.setTimeout(() => setTestState((current) => ({ ...current, [service]: 'demo' })), 500)
  }

  const handleRegisterPasskey = async () => {
    setPasskeyState('working')
    try {
      await registerPasskey({ email: form.adminEmail, name: form.adminName })
      setPasskeyState('success')
    } catch {
      setPasskeyState('idle')
      setShowReview(true)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const duration = Math.min(30, Math.max(1, Number(form.networkAlertDuration) || 3))
    window.localStorage.setItem('pod-network-alert-duration', String(duration))
    setShowReview(true)
    setSaveState('ready')
  }

  const saveLabel = { idle: 'Review configuration', ready: 'Configuration reviewed', saved: 'Configuration saved' }[saveState]

  return (
    <div className="setup-app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="返回首页"><span className="brand-symbol">D</span><span>Done Safe<span className="brand-muted"> / console</span></span></a>
        <div className="setup-badge"><span className="status-dot" /> SETUP MODE</div>
        <div className="topbar-meta"><Icon name="lock" /> Private route</div><LanguageSwitcher />
      </header>

      <div className="setup-layout">
        <aside className="sidebar">
          <div><p className="eyebrow">INITIALIZATION</p><h2>Build your workspace</h2><p className="sidebar-copy">Connect the services that keep every delivery traceable, even when a driver is offline.</p></div>
          <nav className="steps" aria-label="初始化步骤">
            <Step number="01" title="Administrator" detail="Create the first account" active />
            <Step number="02" title="Cloudflare R2" detail="Store delivery evidence" />
            <Step number="03" title="MongoDB" detail="Store orders and metadata" />
            <Step number="04" title="Review" detail="Confirm and hand off" />
          </nav>
          <div className="sidebar-note"><div className="note-icon"><Icon name="shield" /></div><div><strong>Secrets stay server-side</strong><p>This setup form never saves credentials to localStorage or the repository.</p></div></div>
        </aside>

        <main className="setup-main">
          <div className="page-heading"><div><p className="eyebrow">01 / 04 · FIRST RUN</p><h1>Initialize your Done Safe workspace</h1><p>Set up the first administrator and connect storage for your proof of delivery records.</p></div><div className="secure-chip"><Icon name="shield" /> Encrypted transport</div></div>
          <div className="demo-alert"><span className="alert-mark">i</span><p><strong>Frontend setup shell</strong> This screen is ready for the backend handoff. Credentials are held in memory only until <code>POST /api/setup</code> is connected.</p></div>

          <form onSubmit={handleSubmit}>
            <section className="config-card">
              <div className="card-heading"><div className="card-icon purple"><Icon name="shield" /></div><div><p className="card-kicker">ACCESS CONTROL</p><h2>Administrator account</h2><p>Use this account to access the operations console.</p></div></div>
              <div className="form-grid three-columns"><Field label="Full name" value={form.adminName} onChange={update('adminName')} required /><Field label="Work email" type="email" value={form.adminEmail} onChange={update('adminEmail')} placeholder="admin@company.com" required /><SecretField label="Initial password" value={form.adminPassword} onChange={update('adminPassword')} placeholder="At least 12 characters" hint="Do not reuse a personal password." required minLength={12} /></div>
              <div className="form-grid two-columns preference-grid"><label className="field"><span>Workspace timezone</span><select value={form.timezone} onChange={update('timezone')}><option>Australia/Sydney</option><option>Asia/Shanghai</option><option>UTC</option><option>America/Los_Angeles</option></select></label><Field label="Connection alert duration (seconds)" type="number" min="1" max="30" value={form.networkAlertDuration} onChange={update('networkAlertDuration')} hint="The online/offline alert will dismiss automatically." required /></div>
              <div className="passkey-setup"><div><strong>Administrator Passkey</strong><p>Register this device for passwordless admin access. The private key stays with your authenticator.</p></div><button type="button" className={`passkey-setup-button ${passkeyState}`} onClick={handleRegisterPasskey} disabled={passkeyState === 'working' || !form.adminEmail}>{passkeyState === 'success' ? 'Passkey registered' : passkeyState === 'working' ? 'Waiting for device…' : 'Register Passkey'}</button></div>
            </section>

            <section className="config-card">
              <div className="card-heading split-heading"><div className="card-heading-inner"><div className="card-icon purple"><Icon name="shield" /></div><div><p className="card-kicker">NOTIFICATIONS</p><h2>Project email</h2><p>Send passkey registration, password reset and account notification emails.</p></div></div><ConnectionButton state={testState.email} onClick={() => testConnection('email')} /></div>
              <div className="form-grid two-columns"><Field label="Administrator email" type="email" value={form.mailFrom} onChange={update('mailFrom')} placeholder="admin@company.com" required hint="The sender and project contact address." /><Field label="SMTP host" value={form.smtpHost} onChange={update('smtpHost')} placeholder="smtp.mailprovider.com" required /></div>
              <div className="form-grid three-columns"><Field label="SMTP port" type="number" value={form.smtpPort} onChange={update('smtpPort')} placeholder="587" required /><Field label="SMTP username" value={form.smtpUsername} onChange={update('smtpUsername')} placeholder="mailbox username" required /><SecretField label="SMTP password" value={form.smtpPassword} onChange={update('smtpPassword')} placeholder="SMTP password" required /></div>
              <div className="form-grid two-columns"><Field label="IMAP host (optional)" value={form.imapHost} onChange={update('imapHost')} placeholder="imap.mailprovider.com" hint="Only needed if the backend must read this mailbox." /><Field label="IMAP port" type="number" value={form.imapPort} onChange={update('imapPort')} placeholder="993" /></div>
              <div className="form-grid two-columns"><Field label="IMAP username" value={form.imapUsername} onChange={update('imapUsername')} placeholder="mailbox username" /><SecretField label="IMAP password" value={form.imapPassword} onChange={update('imapPassword')} placeholder="IMAP password" /></div>
              <div className="object-path"><span className="path-label">SECURITY NOTE</span><code>SMTP is required for outbound email. Use TLS/STARTTLS and store credentials server-side.</code></div>
            </section>

            <section className="config-card">
              <div className="card-heading split-heading"><div className="card-heading-inner"><div className="card-icon orange"><Icon name="cloud" /></div><div><p className="card-kicker">OBJECT STORAGE</p><h2>Cloudflare R2</h2><p>Photos and signatures are uploaded directly to this bucket.</p></div></div><ConnectionButton state={testState.cloudflare} onClick={() => testConnection('cloudflare')} /></div>
              <div className="form-grid three-columns"><Field label="Account ID" value={form.accountId} onChange={update('accountId')} placeholder="32-character ID" required /><Field label="Bucket name" value={form.bucketName} onChange={update('bucketName')} placeholder="pod-evidence-prod" required /><Field label="R2 endpoint" value={form.accountId ? `https://${form.accountId}.r2.cloudflarestorage.com` : ''} readOnly hint="Generated from Account ID." /></div>
              <div className="form-grid two-columns"><Field label="Access key ID" value={form.accessKeyId} onChange={update('accessKeyId')} placeholder="R2 access key" required /><SecretField label="Secret access key" value={form.secretAccessKey} onChange={update('secretAccessKey')} placeholder="Paste secret access key" hint="Stored as a server secret after backend integration." required /></div>
              <div className="object-path"><span className="path-label">OBJECT KEY PREVIEW</span><code>orderId/proofId/20260831T043020.123Z-photo-uuid.jpg</code></div>
            </section>

            <section className="config-card">
              <div className="card-heading split-heading"><div className="card-heading-inner"><div className="card-icon blue"><Icon name="database" /></div><div><p className="card-kicker">BUSINESS DATA</p><h2>MongoDB connection</h2><p>Orders, POD metadata, sync state and audit events.</p></div></div><ConnectionButton state={testState.mongodb} onClick={() => testConnection('mongodb')} /></div>
              <div className="form-grid two-columns"><SecretField label="Connection string" value={form.mongoUri} onChange={update('mongoUri')} placeholder="mongodb+srv://…" hint="Never expose this value to the React client." required /><Field label="Database name" value={form.databaseName} onChange={update('databaseName')} placeholder="pod" required /></div>
              <div className="form-grid two-columns"><Field label="Orders collection" value={form.collectionName} onChange={update('collectionName')} placeholder="orders" required hint="A dedicated collection for order records." /><div className="schema-preview"><span>Recommended indexes</span><code>orderId · driverId + status · pod.proofId</code></div></div>
            </section>

            <div className="form-footer"><p><Icon name="lock" /> Your browser session is not a secret store.</p><button className="primary-button" type="submit">{saveLabel}<Icon name="arrow" /></button></div>
          </form>

          {showReview && <div className="review-panel" role="status"><div className="review-icon"><Icon name="check" /></div><div><strong>Configuration reviewed</strong><p>The next backend step is to validate these values server-side and persist them as encrypted secrets. No credentials were saved by this frontend.</p></div><button type="button" className="close-review" onClick={() => setShowReview(false)} aria-label="关闭提示">×</button></div>}
        </main>
      </div>
    </div>
  )
}

function ConnectionButton({ state, onClick }) {
  const label = { idle: 'Test connection', testing: 'Testing…', demo: 'Demo check ready' }[state]
  return <button type="button" className={`test-button ${state}`} onClick={onClick} disabled={state === 'testing'}><span className="test-dot" />{label}</button>
}

function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem('pod-session') || 'null')
    return session?.role ? session : null
  } catch {
    sessionStorage.removeItem('pod-session')
    return null
  }
}

function HomePage({ session }) {
  if (!session) return <LoginPage />
  return session.role === 'admin' ? <AdminWithLanguage /> : <DriverApp />
}

function AdminWithLanguage() { return <AdminPage /> }

function App() {
  const pathname = window.location.pathname
  const session = readSession()
  if (pathname === '/__setup') return <SetupPage />
  if (pathname === '/admin') return session?.role === 'admin' ? <AdminWithLanguage /> : <LoginPage defaultRole="admin" />
  if (pathname === '/driver') return session?.role === 'driver' ? <DriverApp /> : <LoginPage />
  if (pathname === '/login') return <LoginPage defaultRole={session?.role || 'driver'} />
  if (pathname === '/') return <HomePage session={session} />
  return <HomePage session={session} />
}

export default App
