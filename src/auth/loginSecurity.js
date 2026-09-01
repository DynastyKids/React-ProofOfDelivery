const SECURITY_KEY = 'pod-login-security'
export const MAX_PASSWORD_ATTEMPTS = 5
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000

function readSecurity() {
  try { return JSON.parse(localStorage.getItem(SECURITY_KEY) || '{}') } catch { return {} }
}

function writeSecurity(value) {
  localStorage.setItem(SECURITY_KEY, JSON.stringify(value))
}

export function getAccountSecurity(email, now = Date.now()) {
  const record = readSecurity()[email] || { failedAttempts: 0, lockedUntil: null }
  if (record.lockedUntil && record.lockedUntil <= now) return { failedAttempts: 0, lockedUntil: null }
  return record
}

export function recordFailedLogin(email) {
  const all = readSecurity()
  const current = getAccountSecurity(email)
  const failedAttempts = current.failedAttempts + 1
  const lockedUntil = failedAttempts >= MAX_PASSWORD_ATTEMPTS ? Date.now() + LOCKOUT_DURATION_MS : null
  all[email] = { failedAttempts, lockedUntil }
  writeSecurity(all)
  return all[email]
}

export function clearLoginFailures(email) {
  const all = readSecurity()
  delete all[email]
  writeSecurity(all)
}

export function listLoginSecurity() {
  const all = readSecurity()
  return Object.keys(all).map((email) => ({ email, ...getAccountSecurity(email) }))
}
