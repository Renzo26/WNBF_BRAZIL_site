import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Instância única acessível para navegação por âncoras
let lenisInstance = null

export function scrollTo(target, opts = {}) {
  if (lenisInstance) lenisInstance.scrollTo(target, { offset: -10, duration: 1.2, ...opts })
}

/**
 * Inicializa o scroll suave (Lenis) e sincroniza com o GSAP ScrollTrigger.
 * O raf é dirigido pelo ticker do GSAP (autoRaf desligado no Lenis 1.3).
 */
export function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.6,
      autoRaf: false,
    })
    lenisInstance = lenis
    // exposto p/ depuração no console do navegador
    window.__lenis = lenis

    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    ScrollTrigger.refresh()

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      lenisInstance = null
      delete window.__lenis
    }
  }, [])
}
