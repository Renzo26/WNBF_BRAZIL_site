/* =====================================================================
   STORE — estado local do app de credenciamento (localStorage)
   ---------------------------------------------------------------------
   Guarda: sessão (JWT + usuário), id do dispositivo, cache de ingressos
   para validação OFFLINE e a fila de check-ins pendentes de sincronização.
   ===================================================================== */

const K = {
  token: 'wnbf_cred_token',
  user: 'wnbf_cred_user',
  device: 'wnbf_cred_device',
  cache: 'wnbf_cred_cache', // { tickets: {code: {...}}, syncedAt }
  queue: 'wnbf_cred_queue', // [{ token, code, at, device_id }]
}

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota/erro — ignorável */
  }
}

/* ---------- sessão ---------- */
export const getToken = () => localStorage.getItem(K.token) || ''
export const getUser = () => read(K.user, null)
export function setSession(token, user) {
  localStorage.setItem(K.token, token)
  write(K.user, user)
}
export function clearSession() {
  localStorage.removeItem(K.token)
  localStorage.removeItem(K.user)
}

/* ---------- id do dispositivo (estável) ---------- */
export function getDeviceId() {
  let id = localStorage.getItem(K.device)
  if (!id) {
    id = globalThis.crypto?.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(K.device, id)
  }
  return id
}

/* ---------- cache offline de ingressos ---------- */
export function saveCache(tickets, syncedAt) {
  const map = {}
  for (const t of tickets) map[t.code] = t
  write(K.cache, { tickets: map, syncedAt })
}
export const getCache = () => read(K.cache, { tickets: {}, syncedAt: null })
export const getSyncedAt = () => getCache().syncedAt

/** Marca um código como usado no cache local (reflete o check-in offline). */
export function markUsedLocally(code, at) {
  const cache = getCache()
  const t = cache.tickets[code]
  if (t) {
    t.status = 'CHECKED_IN'
    t.checked_in_at = at
    write(K.cache, cache)
  }
}

/* ---------- fila de check-ins offline ---------- */
export const getQueue = () => read(K.queue, [])
export function enqueue(item) {
  const q = getQueue()
  q.push(item)
  write(K.queue, q)
}
export const setQueue = (q) => write(K.queue, q)
export const clearQueue = () => write(K.queue, [])
