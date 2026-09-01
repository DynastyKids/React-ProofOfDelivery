import { useEffect, useState } from 'react'
import { clearLoginFailures, getAccountSecurity, MAX_PASSWORD_ATTEMPTS, recordFailedLogin } from './loginSecurity.js'
import { loginWithPasskey } from './passkey.js'
import { loginWithPassword } from './passwordLogin.js'
import { IS_DEMO } from '../config/appMode.js'
import './Auth.css'

const DEMO_ACCOUNTS = {
  admin: { email: 'admin@pod.local', password: 'admin1234', name: 'Operations Admin' },
  driver: { email: 'driver@pod.local', password: '123456', name: 'Jordan Davis' },
}

const DRIVER_ACCOUNTS = [DEMO_ACCOUNTS.driver, { email: 'sofia@pod.local', password: '123456', name: 'Sofia Nguyen' }]

function LoginIcon() {
  return <svg className="login-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.4 2.9 7.5 7 9 4.1-1.5 7-4.6 7-9V6l-7-3Z" /><path d="m8.8 11.8 2.1 2.1 4.4-4.4" /></svg>
}

function LoginPage({ defaultRole = 'driver' }) {
  const [role, setRole] = useState(defaultRole)
  const [email, setEmail] = useState(IS_DEMO ? DEMO_ACCOUNTS[defaultRole].email : '')
  const [password, setPassword] = useState(IS_DEMO ? DEMO_ACCOUNTS[defaultRole].password : '')
  const [error, setError] = useState('')
  const [passkeyState, setPasskeyState] = useState('idle')
  const [submitting, setSubmitting] = useState(false)
  const account = DEMO_ACCOUNTS[role]
  const security = IS_DEMO && role === 'driver' ? getAccountSecurity(email) : { failedAttempts: 0, lockedUntil: null }

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/session', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((session) => {
        if (cancelled || !session?.authenticated) return
        const nextRole = session.role || session.user?.role || defaultRole
        sessionStorage.setItem('pod-session', JSON.stringify({ ...session, role: nextRole }))
        window.location.href = nextRole === 'admin' ? '/admin' : '/driver'
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [defaultRole])

  const selectRole = (nextRole) => {
    setRole(nextRole)
    setEmail(IS_DEMO ? DEMO_ACCOUNTS[nextRole].email : '')
    setPassword(IS_DEMO ? DEMO_ACCOUNTS[nextRole].password : '')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    if (!IS_DEMO) {
      try {
        const session = await loginWithPassword({ role, email, password })
        const nextRole = session?.role || session?.user?.role || role
        sessionStorage.setItem('pod-session', JSON.stringify({ ...session, role: nextRole }))
        window.location.href = nextRole === 'admin' ? '/admin' : '/driver'
      } catch (loginError) {
        setError(loginError.message || 'Unable to sign in.')
        setSubmitting(false)
      }
      return
    }
    const selectedAccount = role === 'driver' ? DRIVER_ACCOUNTS.find((driver) => driver.email === email) : account
    const currentSecurity = role === 'driver' ? getAccountSecurity(email) : { failedAttempts: 0, lockedUntil: null }
    if (currentSecurity.lockedUntil) {
      setError(`This account is locked. Try again in ${Math.ceil((currentSecurity.lockedUntil - Date.now()) / 60000)} minutes or ask an administrator to unlock it.`)
      setSubmitting(false)
      return
    }
    if (!selectedAccount || password !== selectedAccount.password || (role === 'driver' && !/^\d{6}$/.test(password))) {
      const nextSecurity = role === 'driver' ? recordFailedLogin(email) : currentSecurity
      const remaining = MAX_PASSWORD_ATTEMPTS - nextSecurity.failedAttempts
      setError(role === 'driver' && nextSecurity.lockedUntil ? 'Too many failed attempts. This account is locked for 15 minutes.' : `Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`)
      setSubmitting(false)
      return
    }
    if (role === 'driver') clearLoginFailures(email)
    sessionStorage.setItem('pod-session', JSON.stringify({ role, name: selectedAccount.name, email }))
    window.location.href = role === 'admin' ? '/admin' : '/driver'
  }

  const handlePasskey = async () => {
    setError('')
    setPasskeyState('working')
    try {
      const session = await loginWithPasskey()
      const nextRole = session?.role || session?.user?.role || role
      sessionStorage.setItem('pod-session', JSON.stringify({ ...session, role: nextRole }))
      window.location.href = nextRole === 'admin' ? '/admin' : '/driver'
    } catch (passkeyError) {
      setPasskeyState('idle')
      setError(passkeyError.message || 'Passkey login failed.')
    }
  }

  const passkeyLabel = { idle: 'Continue with Passkey', working: 'Waiting for Passkey…' }[passkeyState]

 return <main className="login-page"><div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" /><section className="login-card"><div className="login-brand"><span className="login-logo">P</span><span>POD <small>PROOF OF DELIVERY</small></span></div><div className="login-heading"><p className="login-kicker">SECURE WORKSPACE</p><h1>Welcome back.</h1><p>Sign in to manage deliveries and capture proof on the road.</p></div><div className="role-switch" role="tablist" aria-label="Choose account type"><button type="button" className={role === 'driver' ? 'active' : ''} onClick={() => selectRole('driver')} role="tab" aria-selected={role === 'driver'}>Driver</button><button type="button" className={role === 'admin' ? 'active' : ''} onClick={() => selectRole('admin')} role="tab" aria-selected={role === 'admin'}>Administrator</button></div><form className="login-form" onSubmit={handleSubmit}>{role === 'driver' && IS_DEMO ? <label><span>Choose driver account</span><select value={email} onChange={(event) => { setEmail(event.target.value); setError('') }}>{DRIVER_ACCOUNTS.map((driver) => <option key={driver.email} value={driver.email}>{driver.name} · {driver.email}</option>)}</select></label> : <label><span>Work email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>}<label><span>{role === 'driver' ? '6-digit password' : 'Password'}</span><input type="password" inputMode={role === 'driver' ? 'numeric' : undefined} pattern={role === 'driver' ? '[0-9]{6}' : undefined} maxLength={role === 'driver' ? 6 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{role === 'driver' && IS_DEMO && security.failedAttempts > 0 && !security.lockedUntil && <p className="attempt-hint">{security.failedAttempts} failed attempt{security.failedAttempts > 1 ? 's' : ''} · {MAX_PASSWORD_ATTEMPTS - security.failedAttempts} remaining</p>}{error && <p className="login-error" role="alert">{error}</p>}<button className="login-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Continue'} <span>→</span></button></form><div className="login-divider"><span>or use a device credential</span></div><button type="button" className="passkey-button" onClick={handlePasskey} disabled={passkeyState === 'working'}><LoginIcon />{passkeyLabel}</button>{IS_DEMO && <div className="demo-hint"><LoginIcon /><p><strong>Demo account</strong><span>{role === 'driver' ? `${email} · 6-digit password` : `${account.email} · ${account.password}`}</span></p></div>}<p className="login-footer">Passkeys keep the private key on this device and never send it to the server.</p></section><a className="setup-link" href="/__setup">First-run setup</a></main>
}

export default LoginPage
