// ============================================================
// Meta Pixel (Facebook/Instagram Ads) — helpers de rastreamento
// ------------------------------------------------------------
// O código-base do pixel e o PageView inicial ficam no index.html.
// Aqui ficam os eventos de funil disparados pelo app (SPA):
//   • PageView   — a cada troca de rota (o index.html só cobre o 1º load)
//   • InitiateCheckout — ao entrar no checkout
//   • Purchase   — quando a compra é confirmada (cartão na hora)
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

/** PageView — usado nas trocas de rota da SPA. */
export function fbPageView() {
  fbTrack('PageView')
}
