// ============================================================
// Meta Pixel (Facebook/Instagram Ads) — helpers de rastreamento
// ------------------------------------------------------------
// O código-base do pixel e o único PageView (1º load) ficam no index.html —
// não disparamos PageView de novo nas trocas de rota da SPA.
// Eventos de funil disparados pelo app:
//   • ViewCart          — clique no CTA do hero (ainda não sabe qual ingresso)
//   • AddToCart         — clique num ingresso específico
//   • InitiateCheckout  — clique em "Pagar" no checkout
//   • Purchase          — compra confirmada (cartão na hora)
//
// ⚠️ Pix: a confirmação chega pelo webhook do Asaas, com o cliente já fora
//    do site — por isso o Purchase de Pix é enviado pelo BACKEND (Conversions
//    API). O `eventID` (= id do pedido) permite o Meta deduplicar os dois.
// ============================================================

export const FB_PIXEL_ID = '2079486772606007'

/** Dispara um evento padrão do Meta, de forma segura (no-op se o pixel não carregou). */
export function fbTrack(event, params = undefined, options = undefined) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq('track', event, params, options)
  }
}
