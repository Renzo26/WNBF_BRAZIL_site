import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useNavigate } from 'react-router-dom'
import { EVENT } from '../data'
import { scrollTo } from '../lib/smooth'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/* -------------------------------------------------------------
   SplitWords — headline com revelação palavra a palavra (GSAP)
   ------------------------------------------------------------- */
export function SplitWords({ as: Tag = 'h2', text, className = '', stagger = 0.07, start = 'top 85%', delay = 0 }) {
  const ref = useRef(null)
  useGSAP(
    () => {
      const words = ref.current.querySelectorAll('.w-inner')
      gsap.fromTo(
        words,
        { yPercent: 115, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.95,
          ease: 'power4.out',
          stagger,
          delay,
          scrollTrigger: { trigger: ref.current, start },
        },
      )
    },
    { scope: ref },
  )
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.06em] align-bottom" aria-hidden>
          <span className="w-inner inline-block">{w}&nbsp;</span>
        </span>
      ))}
    </Tag>
  )
}

/* -------------------------------------------------------------
   Reveal — fade/slide ao entrar na viewport
   ------------------------------------------------------------- */
export function Reveal({ children, y = 30, delay = 0, className = '', start = 'top 88%' }) {
  const ref = useRef(null)
  useGSAP(
    () => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          delay,
          ease: 'power3.out',
          scrollTrigger: { trigger: ref.current, start },
        },
      )
    },
    { scope: ref },
  )
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

/* Reveal em lote para filhos diretos (stagger) */
export function StaggerList({ children, className = '', stagger = 0.1, y = 26, start = 'top 85%' }) {
  const ref = useRef(null)
  useGSAP(
    () => {
      gsap.fromTo(
        ref.current.children,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger,
          scrollTrigger: { trigger: ref.current, start },
        },
      )
    },
    { scope: ref },
  )
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

/* -------------------------------------------------------------
   Bits visuais
   ------------------------------------------------------------- */
export function Eyebrow({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-3 eyebrow ${className}`}>
      <span className="h-px w-8 bg-[var(--color-green-deep)]" />
      {children}
    </span>
  )
}

export function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 group-hover:translate-x-1">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* Interpreta o href e devolve um onClick com o comportamento certo:
   - "#..."  → scroll suave (Lenis) até a seção
   - "/..."  → navegação client-side da SPA (sem recarregar)
   - "http…" → link externo normal (abre em nova aba) */
function useSmartHref(href, onClick) {
  const navigate = useNavigate()
  return (e) => {
    if (href?.startsWith('#')) {
      e.preventDefault()
      scrollTo(href)
    } else if (href?.startsWith('/')) {
      e.preventDefault()
      navigate(href)
    }
    onClick?.(e)
  }
}

export function GoldButton({ href, children, className = '', size = 'lg', onClick }) {
  const pad = size === 'lg' ? 'px-9 py-4 text-base' : 'px-6 py-3 text-sm'
  const handleClick = useSmartHref(href, onClick)
  return (
    <a
      href={href}
      onClick={handleClick}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel="noopener noreferrer"
      className={`group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full font-display uppercase tracking-wide text-[#07172e] shadow-green ${pad} ${className}`}
      style={{ background: 'linear-gradient(160deg,#a8e35d 0%,#86c63c 55%,#5f9a2c 100%)' }}
    >
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/55 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        aria-hidden
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </a>
  )
}

export function GhostButton({ href, children, className = '', onClick }) {
  const handleClick = useSmartHref(href, onClick)
  return (
    <a
      href={href}
      onClick={handleClick}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-line)] px-7 py-4 font-display uppercase tracking-wide text-[var(--color-bone)] transition-colors duration-300 hover:border-[var(--color-green)] hover:text-[var(--color-green-hi)] ${className}`}
    >
      {children}
    </a>
  )
}

/* Link âncora que usa o scroll suave do Lenis */
export function ScrollLink({ to, children, className = '', onClick }) {
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault()
        scrollTo(to)
        onClick?.()
      }}
    >
      {children}
    </a>
  )
}

/* -------------------------------------------------------------
   Countdown
   ------------------------------------------------------------- */
function diff() {
  const d = Math.max(0, new Date(EVENT.dateISO).getTime() - Date.now())
  return {
    Dias: Math.floor(d / 86400000),
    Horas: Math.floor((d / 3600000) % 24),
    Min: Math.floor((d / 60000) % 60),
    Seg: Math.floor((d / 1000) % 60),
  }
}

export function Countdown() {
  const [t, setT] = useState(diff)
  useEffect(() => {
    const id = setInterval(() => setT(diff()), 1000)
    return () => clearInterval(id)
  }, [])
  const entries = Object.entries(t)
  return (
    <div className="flex items-stretch gap-2 sm:gap-3">
      {entries.map(([label, val], i) => (
        <div key={label} className="flex items-center gap-2 sm:gap-3">
          <div className="flex flex-col items-center">
            <span className="font-display text-3xl tabular-nums text-green-metal sm:text-4xl">
              {String(val).padStart(2, '0')}
            </span>
            <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[var(--color-muted)]">{label}</span>
          </div>
          {i < entries.length - 1 && <span className="font-display text-2xl text-[var(--color-green-deep)]">:</span>}
        </div>
      ))}
    </div>
  )
}
