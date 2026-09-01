function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = window.atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function bytesToBase64Url(value) {
  const bytes = new Uint8Array(value)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function toBuffer(value) {
  return typeof value === 'string' ? base64UrlToBytes(value) : value
}

function prepareCreationOptions(options) {
  const publicKey = options.publicKey || options
  return {
    ...publicKey,
    challenge: toBuffer(publicKey.challenge),
    user: { ...publicKey.user, id: toBuffer(publicKey.user.id) },
    excludeCredentials: publicKey.excludeCredentials?.map((credential) => ({ ...credential, id: toBuffer(credential.id) })),
  }
}

function prepareRequestOptions(options) {
  const publicKey = options.publicKey || options
  return {
    ...publicKey,
    challenge: toBuffer(publicKey.challenge),
    allowCredentials: publicKey.allowCredentials?.map((credential) => ({ ...credential, id: toBuffer(credential.id) })),
  }
}

function serializeRegistration(credential) {
  return {
    id: credential.id,
    rawId: bytesToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bytesToBase64Url(credential.response.clientDataJSON),
      attestationObject: bytesToBase64Url(credential.response.attestationObject),
      transports: credential.response.getTransports?.() || [],
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  }
}

function serializeAuthentication(credential) {
  return {
    id: credential.id,
    rawId: bytesToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bytesToBase64Url(credential.response.clientDataJSON),
      authenticatorData: bytesToBase64Url(credential.response.authenticatorData),
      signature: bytesToBase64Url(credential.response.signature),
      userHandle: credential.response.userHandle ? bytesToBase64Url(credential.response.userHandle) : null,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  }
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers }, ...options })
  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json') ? await response.json() : null
  if (!response.ok) throw new Error(body?.message || `Passkey service returned ${response.status}`)
  return body
}

function ensureSupport() {
  if (!window.PublicKeyCredential || !navigator.credentials) throw new Error('This browser does not support Passkey login.')
}

export async function loginWithPasskey() {
  ensureSupport()
  const options = await requestJson('/api/auth/passkey/login/options', { method: 'POST', body: '{}' })
  const credential = await navigator.credentials.get({ publicKey: prepareRequestOptions(options) })
  if (!credential) throw new Error('Passkey login was cancelled.')
  return requestJson('/api/auth/passkey/login/verify', { method: 'POST', body: JSON.stringify(serializeAuthentication(credential)) })
}

export async function registerPasskey({ email, name }) {
  ensureSupport()
  const options = await requestJson('/api/auth/passkey/register/options', { method: 'POST', body: JSON.stringify({ email, name }) })
  const credential = await navigator.credentials.create({ publicKey: prepareCreationOptions(options) })
  if (!credential) throw new Error('Passkey registration was cancelled.')
  return requestJson('/api/auth/passkey/register/verify', { method: 'POST', body: JSON.stringify(serializeRegistration(credential)) })
}
