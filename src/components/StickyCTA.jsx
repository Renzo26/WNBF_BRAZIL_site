import { useEffect, useState } from 'react'
import { TICKET_URL } from '../data'
import { Arrow } from './ui'

export default function StickyCTA() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.9)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 px-3 transition-all duration-500 ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="mx-auto mb-3 flex max-w-2xl items-center justify-between gap-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]/92 px-4 py-3 shadow-2xl backdrop-blur-xl sm:px-5">
        <div className="leading-tight">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-green)]">
            1º Lote · vagas limitadas
          </p>
          <p className="font-display text-lg uppercase text-[var(--color-bone)]">Garanta o menor preço</p>
        </div>
        <a
          href={TICKET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-green-grad px-5 py-3 font-display text-sm uppercase tracking-wide text-[var(--color-ink)]"
        >
          Comprar <Arrow />
        </a>
      </div>
    </div>
  )
}
