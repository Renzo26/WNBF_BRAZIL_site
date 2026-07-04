import { useEffect, useState } from 'react'
import { EVENT } from '../data'
import { Arrow, GoldButton, ScrollLink } from './ui'

const LINKS = [
  ['O Evento', '#evento'],
  ['100% Natural', '#natural'],
  ['Categorias', '#categorias'],
  ['Ingressos', '#ingressos'],
  ['Localização', '#localizacao'],
]

export default function Nav() {
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid ? 'border-b border-[var(--color-line)] bg-[var(--color-ink)]/85 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <ScrollLink to="#top" className="flex items-center">
          <img
            src="/brand/wnbf-logo.png"
            alt="WNBF Brasil"
            className="h-14 w-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:scale-[1.04] sm:h-16"
          />
        </ScrollLink>

        <ul className="hidden items-center gap-8 lg:flex">
          {LINKS.map(([label, href]) => (
            <li key={href}>
              <ScrollLink
                to={href}
                className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-muted)] transition-colors hover:text-[var(--color-green-hi)]"
              >
                {label}
              </ScrollLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <GoldButton href="#ingressos" size="sm" className="group hidden sm:inline-flex">
            Garantir ingresso <Arrow />
          </GoldButton>
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-line)] lg:hidden"
            aria-label="Menu"
          >
            <span className="flex flex-col gap-1.5">
              <span className={`h-0.5 w-5 bg-[var(--color-bone)] transition ${open ? 'translate-y-2 rotate-45' : ''}`} />
              <span className={`h-0.5 w-5 bg-[var(--color-bone)] transition ${open ? 'opacity-0' : ''}`} />
              <span className={`h-0.5 w-5 bg-[var(--color-bone)] transition ${open ? '-translate-y-2 -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </nav>

      <div
        className={`overflow-hidden border-t border-[var(--color-line)] bg-[var(--color-ink)]/95 backdrop-blur-xl transition-all duration-500 lg:hidden ${
          open ? 'max-h-96' : 'max-h-0 border-transparent'
        }`}
      >
        <ul className="flex flex-col gap-1 px-5 py-4">
          {LINKS.map(([label, href]) => (
            <li key={href}>
              <ScrollLink
                to={href}
                onClick={() => setOpen(false)}
                className="block py-3 font-display text-xl uppercase text-[var(--color-bone)]"
              >
                {label}
              </ScrollLink>
            </li>
          ))}
          <li className="pt-2 font-mono text-xs text-[var(--color-muted)]">
            {EVENT.dateFull} · {EVENT.city}
          </li>
        </ul>
      </div>
    </header>
  )
}
