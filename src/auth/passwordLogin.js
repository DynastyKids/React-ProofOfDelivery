export async function loginWithPassword({ role, email, password }) {
  const response = await fetch('/api/auth/password/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, email, password }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || 'Unable to sign in.')
  return payload
}

export async function changePassword({ currentPassword, newPassword }) {
  const response = await fetch('/api/auth/password/change', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || 'Unable to change password.')
  return payload
}
