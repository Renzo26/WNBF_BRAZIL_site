import { useState } from 'react'

/**
 * Decide se a página deve carregar os recursos visuais "pesados" — o emblema
 * 3D (WebGL/three.js) e o vídeo de fundo do hero.
 *
 * Em mobile esses recursos derrubam a performance: o loop de render do WebGL
 * monopoliza a thread principal (TBT altíssimo) e o vídeo pesa no payload. Aí
 * mostramos versões estáticas (emblema SVG + poster). No desktop mantemos a
 * experiência completa.
 *
 * A decisão é feita uma única vez, na montagem (não reage a resize — o custo de
 * remontar o canvas 3D não compensaria).
 */
export function useRichVisuals() {
  const [rich] = useState(() => {
    if (typeof window === 'undefined') return false
    const desktop = window.matchMedia('(min-width: 1024px)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = navigator.connection?.saveData === true
    return desktop && !reduced && !saveData
  })
  return rich
}
