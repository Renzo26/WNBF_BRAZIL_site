/* =====================================================================
   API do credenciamento — chamadas autenticadas (Bearer JWT).
   ===================================================================== */
import { clearSession, getToken } from './store'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = {}
  try {
    data = await res.json()
  } catch {
    /* sem corpo */
  }
  if (res.status === 401 && auth) {
    clearSession()
    throw new ApiError('Sessão expirada. Entre novamente.', 401)
  }
  if (!res.ok) {
    const msg = typeof data.detail === 'string' ? data.detail : 'Não foi possível concluir a operação.'
    throw new ApiError(msg, res.status)
  }
  return data
}

export const login = (username, password) =>
  request('/auth/login', { method: 'POST', body: { username, password }, auth: false })

export const me = () => request('/auth/me')

export const validate = (token, deviceId) =>
  request('/validation/validate', { method: 'POST', body: { token, device_id: deviceId } })

export const syncDown = () => request('/validation/sync')

export const syncUp = (checkins) =>
  request('/validation/sync', { method: 'POST', body: { checkins } })

export const getStats = () => request('/validation/stats')
