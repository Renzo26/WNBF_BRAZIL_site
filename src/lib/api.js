// Base da API. Em produção vem do build-arg VITE_API_URL; no dev cai no backend local.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

/** Envia o checkout ao backend. Em modo simulação, o backend marca como pago e
 *  dispara a confirmação (n8n → WhatsApp). Retorna { order_id, status, ... }. */
export async function postCheckout(payload, idempotencyKey) {
  const res = await fetch(`${API_URL}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  })
  let data = {}
  try {
    data = await res.json()
  } catch {
    /* resposta sem corpo */
  }
  if (!res.ok) {
    const msg =
      typeof data.detail === 'string'
        ? data.detail
        : 'Não foi possível processar o pagamento. Confira os dados e tente novamente.'
    throw new Error(msg)
  }
  return data
}
