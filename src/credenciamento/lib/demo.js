/* =====================================================================
   MODO DEMONSTRAÇÃO (temporário) — permite ver o scanner e os overlays
   de resultado SEM backend. Ativado pelo botão no login ou por ?demo=1.
   Para remover: apague este arquivo e as chamadas isDemo()/demoValidate()
   em validation.js, Scanner.jsx e CredApp.jsx.
   ===================================================================== */
import { parseCode } from './parse'

const KEY = 'wnbf_cred_demo'

let active =
  (typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo')) ||
  (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(KEY) === '1')

export const isDemo = () => active
export function setDemo(v) {
  active = v
  try {
    if (v) sessionStorage.setItem(KEY, '1')
    else sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export const DEMO_USER = { id: 'demo', username: 'demo', name: 'Equipe Demo', role: 'ADMIN' }

const NOMES = [
  'Ana Beatriz Ferreira', 'Carlos Eduardo Lima', 'Mariana Souza Rocha', 'Rafael Almeida Costa',
  'Juliana Martins Dias', 'Bruno Henrique Silva', 'Larissa Oliveira Nunes', 'Gustavo Pereira Ramos',
]
const TIPOS = [
  { name: 'Passaporte 2 Dias', slug: 'passaporte-2-dias' },
  { name: 'Ingresso Dia 1', slug: 'dia-1' },
  { name: 'Ingresso Dia 2', slug: 'dia-2' },
]

const hash = (s) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const seen = new Map() // code -> checked_in_at
let stats = { total: 250, checked_in: 137, remaining: 113, canceled: 4 }

export const demoStats = () => ({ ...stats })

/** Simula a validação. Dicas p/ mostrar todos os estados na demo:
 *  - código com "CANCEL" -> cancelado
 *  - código com "INVAL"  -> inválido
 *  - qualquer outro: 1ª vez LIBERADO, 2ª vez JÁ USADO. */
export function demoValidate(raw) {
  const code = (parseCode(raw) || '').toUpperCase()
  if (!code || code.length < 4 || code.includes('INVAL')) {
    return { result: 'invalid', message: 'QR Code inválido ou não reconhecido.', ticket: null, offline: false }
  }
  const h = hash(code)
  const info = {
    code,
    holder_name: NOMES[h % NOMES.length],
    ticket_name: TIPOS[h % TIPOS.length].name,
    ticket_slug: TIPOS[h % TIPOS.length].slug,
    status: 'VALID',
    checked_in_at: null,
    checked_in_by: null,
  }

  if (code.includes('CANCEL')) {
    return { result: 'canceled', message: 'Ingresso cancelado.', ticket: { ...info, status: 'CANCELED' }, offline: false }
  }
  if (seen.has(code)) {
    return {
      result: 'duplicate',
      message: 'Ingresso já utilizado.',
      ticket: { ...info, status: 'CHECKED_IN', checked_in_at: seen.get(code), checked_in_by: 'Equipe Demo' },
      offline: false,
    }
  }
  const at = new Date().toISOString()
  seen.set(code, at)
  stats = { ...stats, checked_in: stats.checked_in + 1, remaining: Math.max(0, stats.remaining - 1) }
  return {
    result: 'approved',
    message: 'Entrada liberada.',
    ticket: { ...info, status: 'CHECKED_IN', checked_in_at: at },
    offline: false,
  }
}
