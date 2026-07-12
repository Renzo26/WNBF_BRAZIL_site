/* =====================================================================
   Validação de ingresso — decide ONLINE x OFFLINE.
   ---------------------------------------------------------------------
   Online : consulta o backend (fonte da verdade, check-in atômico).
   Offline: valida contra o cache baixado e enfileira o check-in para
            sincronizar depois. Se a rede falhar no meio, cai para offline.
   ===================================================================== */
import { validate as apiValidate, syncUp } from './credApi'
import { demoValidate, isDemo } from './demo'
import { parseCode } from './parse'
import {
  enqueue,
  getCache,
  getDeviceId,
  getQueue,
  markUsedLocally,
  setQueue,
} from './store'

const INVALID = (message) => ({ result: 'invalid', message, ticket: null, offline: false })

export async function validateTicket(raw) {
  if (isDemo()) return demoValidate(raw) // modo demonstração (sem backend)
  const code = parseCode(raw)
  if (!code) return INVALID('QR Code inválido.')
  const deviceId = getDeviceId()

  if (navigator.onLine) {
    try {
      const data = await apiValidate(raw, deviceId)
      if (data.result === 'approved') markUsedLocally(code, data.ticket?.checked_in_at)
      return { ...data, offline: false }
    } catch (err) {
      // 401 sobe (força re-login); erro de rede cai para offline
      if (err.status === 401) throw err
      if (err.status && err.status !== 0) {
        return { result: 'invalid', message: err.message, ticket: null, offline: false }
      }
      // sem status = falha de fetch (offline real) -> segue para o caminho offline
    }
  }

  return validateOffline(raw, code, deviceId)
}

function validateOffline(raw, code, deviceId) {
  const { tickets } = getCache()
  const t = tickets[code]
  if (!t) {
    return {
      result: 'invalid',
      message: 'Ingresso não encontrado no cache offline. Sincronize quando houver rede.',
      ticket: null,
      offline: true,
    }
  }
  const info = {
    code: t.code,
    holder_name: t.holder_name,
    ticket_name: t.ticket_name,
    ticket_slug: t.ticket_slug,
    status: t.status,
    checked_in_at: t.checked_in_at || null,
    checked_in_by: null,
  }
  if (t.status === 'CANCELED') {
    return { result: 'canceled', message: 'Ingresso cancelado.', ticket: info, offline: true }
  }
  if (t.status === 'CHECKED_IN') {
    return { result: 'duplicate', message: 'Ingresso já utilizado.', ticket: info, offline: true }
  }
  // VALID -> libera offline, marca local e enfileira
  const at = new Date().toISOString()
  markUsedLocally(code, at)
  enqueue({ token: raw, code, at, device_id: deviceId })
  return {
    result: 'approved',
    message: 'Entrada liberada (offline).',
    ticket: { ...info, status: 'CHECKED_IN', checked_in_at: at },
    offline: true,
  }
}

/** Envia a fila de check-ins offline ao servidor. Retorna { sent, conflicts }. */
export async function flushQueue() {
  const queue = getQueue()
  if (!queue.length) return { sent: 0, conflicts: 0 }
  const res = await syncUp(queue.map((q) => ({ token: q.token, at: q.at, device_id: q.device_id })))
  const conflicts = (res.results || []).filter((r) => r.result === 'duplicate').length
  setQueue([]) // processados
  return { sent: queue.length, conflicts, stats: res.stats }
}
