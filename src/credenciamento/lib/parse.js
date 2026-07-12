/* Extrai o `code` do ingresso a partir do conteúdo lido (QR ou digitação).
   Espelha o backend (core/tokens.py): QR = "NFH1:<code>:<sig>".
   Offline não dá para conferir a assinatura (a chave é secreta e fica no
   servidor) — a segurança offline vem da lista de códigos válidos baixada. */
export function parseCode(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (s.startsWith('NFH1:')) {
    const parts = s.split(':')
    if (parts.length !== 3) return null
    return parts[1].toUpperCase()
  }
  return s.toUpperCase()
}
