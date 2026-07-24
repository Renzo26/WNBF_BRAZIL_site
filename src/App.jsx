import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Nav from './components/Nav'
import StickyCTA from './components/StickyCTA'
import {
  Arrow,
  Eyebrow,
  GhostButton,
  GoldButton,
  Reveal,
  SplitWords,
  StaggerList,
} from './components/ui'
import { scrollTo, useSmoothScroll } from './lib/smooth'
import { useRichVisuals } from './lib/device'
import { fbTrack } from './lib/fpixel'
import { CATEGORIES, EVENT, FAQ, LOCATION, LOTE, TICKETS, WHATSAPP_URL, getMapLinks } from './data'

// Emblema 3D flutuante (carregado sob demanda — code splitting)
const FloatingEmblem = lazy(() => import('./three/FloatingEmblem'))

gsap.registerPlugin(ScrollTrigger, useGSAP)

/* =====================================================================
   HERO
   ===================================================================== */
/* Vídeo de fundo: mostra o poster imediatamente e só inicia a reprodução
   quando o vídeo tem buffer suficiente (estratégia de performance). */
function HeroVideo({ enabled }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!enabled) return
    const v = ref.current
    if (!v) return
    // Só começa a baixar o vídeo depois que a página carrega (não compete com o
    // LCP; o poster aparece de imediato). Em conexões lentas o poster permanece.
    const start = () => {
      v.preload = 'auto'
      v.play().catch(() => {})
    }
    if (document.readyState === 'complete') start()
    else {
      window.addEventListener('load', start, { once: true })
      return () => window.removeEventListener('load', start)
    }
  }, [enabled])

  // Mobile / reduced-motion: apenas o poster (primeiro frame), sem baixar o
  // vídeo de ~13 MB nem pagar o custo de decodificação.
  if (!enabled) {
    return (
      <img
        src="/video/hero-poster.webp"
        alt=""
        aria-hidden
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }

  return (
    <video
      ref={ref}
      className="absolute inset-0 h-full w-full object-cover"
      poster="/video/hero-poster.webp"
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
      tabIndex={-1}
    >
      <source src="/video/hero.mp4" type="video/mp4" />
    </video>
  )
}

function Hero({ rich }) {
  const scope = useRef(null)
  const sceneRef = useRef(null)

  useGSAP(
    () => {
      // Entrada
      gsap.fromTo(
        '.hero-fade',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.14, delay: 0.3 },
      )
      // Parallax de saída ao rolar
      gsap.to(sceneRef.current, {
        yPercent: 16,
        ease: 'none',
        scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: true },
      })
      gsap.to('.hero-content', {
        yPercent: -10,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: scope.current, start: 'center top', end: 'bottom top', scrub: true },
      })
    },
    { scope },
  )

  return (
    <section ref={scope} id="top" className="relative min-h-[100svh] overflow-hidden">
      <div ref={sceneRef} className="absolute inset-0">
        <HeroVideo enabled={rich} />
        {/* scrim neutro leve (sem tom azul) só para o título/logo ficarem legíveis */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.38)_0%,rgba(0,0,0,0.12)_38%,rgba(0,0,0,0.34)_100%)]" />
        {/* brilho verde da marca */}
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_72%_18%,rgba(134,198,60,0.16),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_40%_at_18%_82%,rgba(134,198,60,0.10),transparent_60%)]" />

        <div className="vignette pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--color-ink)] to-transparent" />
      </div>

      <div className="hero-content relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col items-center justify-center px-5 pb-16 pt-24 text-center sm:px-8">
        <h1 className="sr-only">Natural Fitness & Health Brasil 2026 — WNBF Brazilian Championships</h1>

        <Eyebrow className="hero-fade">
          {EVENT.championship} · {EVENT.city}
        </Eyebrow>

        {/* Lockup do Hero: o emblema (topo) é renderizado em 3D sobre a âncora;
            apenas o texto NATURAL FITNESS & HEALTH BRASIL fica como imagem 2D. */}
        <div className="hero-fade relative mt-5 aspect-[755.25/557.1] w-[clamp(190px,32vw,380px)]">
          {rich ? (
            <div
              id="emblem-anchor"
              aria-hidden
              className="pointer-events-auto absolute z-20 cursor-pointer"
              style={{ left: '21.6%', top: '0%', width: '56.8%', height: '56.5%' }}
            />
          ) : (
            /* Sem WebGL: emblema estático (mesmo viewBox do lockup). */
            <img
              src="/brand/emblem.svg"
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_0_28px_rgba(134,198,60,0.28)]"
            />
          )}
          <img
            src="/brand/natural-fitness-text.svg"
            alt="Natural Fitness & Health Brasil"
            className="absolute bottom-0 left-0 w-full drop-shadow-[0_0_28px_rgba(134,198,60,0.28)]"
          />
        </div>

        <SplitWords
          as="p"
          text="Onde o físico natural é provado"
          className="mt-5 max-w-2xl text-[clamp(1.05rem,2.4vw,1.75rem)] leading-[0.95]"
          stagger={0.08}
          delay={0.4}
        />

        <div className="hero-fade mt-7 flex flex-col items-center gap-4">
          {LOTE.badge && (
            <span className="badge-lote inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.22em]">
              <span className="dot-urgency h-1.5 w-1.5 animate-urgency-pulse rounded-full" />
              {LOTE.urgency ?? `${LOTE.label} · vagas limitadas`}
            </span>
          )}
          <GoldButton
            href="#ingressos"
            size="sm"
            className="group"
            onClick={() =>
              fbTrack('ViewCart', {
                content_type: 'product',
                content_name: 'Ingressos Natural Fitness & Health 2026',
                currency: 'BRL',
              })
            }
          >
            {LOTE.heroCta} <Arrow />
          </GoldButton>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-muted)]">Role</span>
        <span className="h-10 w-px animate-pulse bg-gradient-to-b from-[var(--color-green)] to-transparent" />
      </div>
    </section>
  )
}

/* =====================================================================
   MARQUEE
   ===================================================================== */
function Marquee() {
  // No 2º lote, o marquee ganha tom de urgência (texto e estrela âmbar).
  const urgent = !!LOTE.badge
  const items = LOTE.marquee ?? ['100% DRUG-FREE', 'POLÍGRAFO OBRIGATÓRIO', 'EXAME WADA', 'WNBF CHAMPIONSHIPS', 'NATURAL FITNESS EXPO', '10·11 OUT 2026']
  const row = [...items, ...items]
  return (
    <div className="overflow-hidden border-y border-[var(--color-line)] bg-navy-glass py-4">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-10 font-display text-lg uppercase tracking-wide text-[var(--color-muted)]">
            {t}
            <span className={urgent ? 'text-[var(--color-urgency)]' : 'text-[var(--color-green-deep)]'}>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* =====================================================================
   O EVENTO
   ===================================================================== */
function Evento() {
  const stats = [
    ['2', 'dias de evento'],
    ['6', 'categorias'],
    ['100%', 'atletas testados'],
    ['1', 'palco internacional'],
  ]
  const days = [
    {
      day: 'Dia 01 — 10 Out',
      title: 'Eliminatórias & Expo',
      text: 'Abertura da expo, ativações de marcas, eliminatórias por categoria e o aquecimento do público para a grande final.',
    },
    {
      day: 'Dia 02 — 11 Out',
      title: 'Finais & Pro Cards',
      text: 'As finais do WNBF Brazilian Championships, entrega de Pro Cards e a consagração dos campeões nacionais.',
    },
  ]
  return (
    <section id="evento" className="theme-light">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <Reveal>
            <Eyebrow>O Evento</Eyebrow>
          </Reveal>
          <SplitWords text="Dois dias que separam o verdadeiro do resto" className="mt-6 text-[clamp(2.2rem,5vw,4rem)]" />
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-lg text-[var(--color-muted)]">
              O <strong className="text-[var(--color-bone)]">{EVENT.name}</strong> reúne, no coração de São Paulo, a
              etapa brasileira da federação de fisiculturismo natural mais antiga e respeitada do mundo — somada a uma
              expo que coloca marcas, ciência e público frente a frente com a elite drug-free.
            </p>
          </Reveal>
          <StaggerList className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-line)]">
            {stats.map(([n, l]) => (
              <div key={l} className="bg-[var(--color-surface)] p-6">
                <div className="font-display text-4xl text-green-metal sm:text-5xl">{n}</div>
                <div className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-muted)]">{l}</div>
              </div>
            ))}
          </StaggerList>
        </div>

        <StaggerList className="flex flex-col gap-4" stagger={0.12}>
          {days.map((d, i) => (
            <article
              key={d.day}
              className="group relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-ink-2)] p-8 transition-colors duration-500 hover:border-[var(--color-green-deep)]"
            >
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-green)]">{d.day}</span>
              <h3 className="mt-3 text-3xl">{d.title}</h3>
              <p className="mt-3 max-w-md text-sm text-[var(--color-muted)]">{d.text}</p>
              <span className="pointer-events-none absolute -right-6 -top-10 font-display text-[8rem] leading-none text-[var(--color-bone)] opacity-[0.04] transition group-hover:opacity-[0.07]">
                0{i + 1}
              </span>
            </article>
          ))}
        </StaggerList>
      </div>
      </div>
    </section>
  )
}

/* =====================================================================
   100% NATURAL — contador GSAP
   ===================================================================== */
function Counter({ to, suffix = '' }) {
  const ref = useRef(null)
  useGSAP(
    () => {
      const obj = { v: 0 }
      gsap.to(obj, {
        v: to,
        duration: 1.8,
        ease: 'power2.out',
        snap: { v: 1 },
        scrollTrigger: { trigger: ref.current, start: 'top 85%' },
        onUpdate: () => {
          if (ref.current) ref.current.textContent = Math.round(obj.v) + suffix
        },
      })
    },
    { scope: ref },
  )
  return <span ref={ref}>0{suffix}</span>
}

function Natural() {
  const pillars = [
    { big: <Counter to={100} suffix="%" />, title: 'Polígrafo obrigatório', text: 'Todo competidor passa por teste de polígrafo antes de subir ao palco. Sem exceção, sem privilégio.' },
    { big: 'WADA', title: 'Exame de urina', text: 'Amostras enviadas a laboratórios credenciados pela Agência Mundial Antidoping. O padrão do esporte olímpico.' },
    { big: <Counter to={10} />, title: 'Anos livre de substâncias', text: 'Para competir, o atleta precisa estar limpo de anabolizantes e diuréticos farmacêuticos há, no mínimo, uma década.' },
  ]
  return (
    <section id="natural" className="relative overflow-hidden border-y border-[var(--color-line)] bg-navy-glass">
      <div className="pointer-events-none absolute inset-0 vignette opacity-60" />
      {/* Selo WNBF: logo novo como marca d'água atrás dos elementos à direita */}
      <img
        src="/brand/wnbf-logo.png"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute -right-10 top-1/2 w-[min(56vw,640px)] max-w-none -translate-y-1/2 select-none opacity-[0.06] mix-blend-screen sm:-right-20 lg:-right-24"
      />
      <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <Reveal>
          <Eyebrow>100% Natural</Eyebrow>
        </Reveal>
        <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <SplitWords text="Não é natural só no nome" className="text-[clamp(2.4rem,6vw,5rem)]" />
          <Reveal delay={0.1}>
            <p className="text-[var(--color-muted)]">
              Enquanto outros palcos fecham os olhos, a WNBF testa{' '}
              <strong className="text-[var(--color-bone)]">absolutamente todos</strong>. Aqui, cada músculo conta uma
              história de disciplina — não de farmácia. É por isso que um troféu WNBF vale o que vale.
            </p>
          </Reveal>
        </div>

        <StaggerList
          className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-3"
          stagger={0.12}
        >
          {pillars.map((p) => (
            <div key={p.title} className="group h-full bg-[var(--color-surface)] p-8 transition-colors duration-500 hover:bg-[var(--color-surface-2)]">
              <div className="font-display text-6xl text-green-metal">{p.big}</div>
              <h3 className="mt-4 text-2xl">{p.title}</h3>
              <p className="mt-3 text-sm text-[var(--color-muted)]">{p.text}</p>
            </div>
          ))}
        </StaggerList>
      </div>
    </section>
  )
}

/* =====================================================================
   CATEGORIAS — scroll horizontal com pin (GSAP ScrollTrigger)
   ===================================================================== */
function Categorias() {
  const section = useRef(null)
  const track = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        const amount = track.current.scrollWidth - window.innerWidth + 96
        gsap.to(track.current, {
          x: -amount,
          ease: 'none',
          scrollTrigger: {
            trigger: section.current,
            start: 'top top',
            end: () => '+=' + amount,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        })
      })
    },
    { scope: section },
  )

  return (
    <section ref={section} id="categorias" className="relative overflow-hidden py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <Reveal>
              <Eyebrow>Categorias</Eyebrow>
            </Reveal>
            <SplitWords text="Seis divisões. Um padrão." className="mt-6 max-w-xl text-[clamp(2.2rem,5vw,4rem)]" />
          </div>
          <Reveal delay={0.1}>
            <p className="max-w-xs text-sm text-[var(--color-muted)]">
              Do bodybuilding clássico ao wellness — cada categoria com julgamento próprio e o mesmo rigor antidoping.
            </p>
          </Reveal>
        </div>
      </div>

      {/* Trilho horizontal (desliza no desktop, swipe no mobile) */}
      <div className="mt-12 overflow-x-auto px-5 sm:px-8 lg:overflow-visible [scrollbar-width:none]">
        <div ref={track} className="flex gap-5 pr-5">
          {CATEGORIES.map((c) => (
            <article
              key={c.name}
              className="group relative flex h-[60vh] max-h-[460px] w-[78vw] shrink-0 flex-col justify-end overflow-hidden rounded-3xl border border-[var(--color-line)] bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-ink-2)] p-8 transition-colors duration-500 hover:border-[var(--color-green-deep)] sm:w-[52vw] lg:w-[34vw] xl:w-[30vw]"
            >
              {/* imagem do atleta */}
              {c.image ? (
                <>
                  <img
                    src={c.image}
                    alt={`Atleta ${c.name}`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{ objectPosition: c.photoPosition }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)] via-[rgba(6,18,42,0.55)] to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.07]">
                  <span className="font-display text-[12rem] leading-none text-[var(--color-bone)]">{c.n}</span>
                </div>
              )}
              <span className="relative font-mono text-xs text-[var(--color-green)]">{c.n} / 06</span>
              <h3 className="relative mt-3 text-4xl transition-colors group-hover:text-green-metal">{c.name}</h3>
              <p className="relative mt-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                {c.kicker}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* =====================================================================
   PARA QUEM É
   ===================================================================== */
function ParaQuem() {
  const list = [
    'Atletas natural que querem competir ou se inspirar',
    'Treinadores e preparadores buscando referência técnica',
    'Profissionais de saúde, nutrição e educação física',
    'Marcas e lojas do universo fitness e suplementação',
    'Entusiastas que admiram o físico construído sem atalhos',
  ]
  return (
    <section className="border-t border-[var(--color-line)] bg-navy-glass">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 sm:py-28 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <Reveal>
            <Eyebrow>Para quem é</Eyebrow>
          </Reveal>
          <SplitWords text="Feito para quem respeita o processo" className="mt-6 text-[clamp(2rem,4.5vw,3.4rem)]" />
        </div>
        <StaggerList className="flex flex-col" stagger={0.08}>
          {list.map((item, i) => (
            <div key={item} className="flex items-center gap-5 border-b border-[var(--color-line)] py-5 transition-colors hover:border-[var(--color-green-deep)]">
              <span className="font-mono text-xs text-[var(--color-green)]">0{i + 1}</span>
              <span className="text-lg text-[var(--color-bone)]">{item}</span>
            </div>
          ))}
        </StaggerList>
      </div>
    </section>
  )
}

/* =====================================================================
   LOCALIZAÇÃO — mapa + navegação (Waze, Google Maps, Apple Maps)
   ===================================================================== */
function MapButton({ href, label, tint, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-center gap-2.5 rounded-2xl px-5 py-4 font-display text-sm uppercase tracking-wide text-white transition-transform duration-300 hover:-translate-y-0.5"
      style={{ background: tint }}
    >
      <span className="grid h-5 w-5 place-items-center [&_svg]:h-5 [&_svg]:w-5">{children}</span>
      {label}
    </a>
  )
}

function Localizacao() {
  const links = getMapLinks()
  return (
    <section id="localizacao" className="relative overflow-hidden border-t border-[var(--color-line)] bg-navy-glass">
      <div className="pointer-events-none absolute inset-0 vignette opacity-50" />
      <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow>Como chegar</Eyebrow>
          </Reveal>
          <SplitWords text="O palco natural é aqui" className="mt-6 text-[clamp(2.2rem,5vw,4rem)]" />
          <Reveal delay={0.1}>
            <p className="mt-6 text-[var(--color-muted)]">
              Abra a rota direto no seu app favorito e venha viver o {EVENT.name} ao vivo.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Mapa */}
          <Reveal className="relative overflow-hidden rounded-3xl border border-[var(--color-line)] shadow-[0_28px_80px_-40px_rgba(10,31,60,0.7)]">
            <iframe
              title={`Mapa — ${LOCATION.line1}`}
              src={links.embed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[340px] w-full sm:h-[420px] lg:h-full lg:min-h-[440px]"
              style={{ border: 0 }}
            />
            {/* Card do endereço sobre o mapa */}
            <div className="pointer-events-none absolute left-4 top-4 max-w-[19rem] rounded-2xl border border-[var(--color-line)] bg-[var(--color-ink)]/90 p-4 backdrop-blur-md">
              <p className="font-display text-lg uppercase leading-none text-[var(--color-bone)]">{LOCATION.name}</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {LOCATION.line1} — {LOCATION.line2}
                <br />
                CEP {LOCATION.cep}
              </p>
            </div>
          </Reveal>

          {/* Coluna de navegação */}
          <StaggerList className="flex flex-col justify-center gap-3" stagger={0.08}>
            <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-[var(--color-green)]">Endereço</span>
              <p className="mt-3 font-display text-2xl uppercase leading-tight text-[var(--color-bone)]">{LOCATION.name}</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {LOCATION.line1} — {LOCATION.line2} · CEP {LOCATION.cep}
              </p>
            </div>

            <MapButton href={links.google} label="Google Maps" tint="#4285f4">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" fill="#fff" fillOpacity="0.22" />
                <circle cx="12" cy="9" r="2.6" fill="#fff" />
              </svg>
            </MapButton>

            <MapButton href={links.waze} label="Waze" tint="#33ccff">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20 10.5a8 8 0 1 0-13.7 5.6c.3.3.4.7.3 1.1l-.3 1.3 2.2-.4c.3 0 .6 0 .8.1a8 8 0 0 0 3.4.8c4.4 0 8-3.4 8-7.6Z" fill="#fff" fillOpacity="0.25" stroke="#fff" strokeWidth="1.4" />
                <circle cx="9.5" cy="10" r="1" fill="#fff" />
                <circle cx="14.5" cy="10" r="1" fill="#fff" />
                <path d="M9 13.5a3.2 3.2 0 0 0 5 0" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </MapButton>

            <MapButton href={links.apple} label="Apple Maps" tint="#3d3d3f">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" fill="#fff" fillOpacity="0.22" />
                <circle cx="12" cy="9" r="2.6" fill="#fff" />
              </svg>
            </MapButton>
          </StaggerList>
        </div>
      </div>
    </section>
  )
}

/* =====================================================================
   LOTES — linha de virada (exibida só no 2º lote)
   ===================================================================== */
function LotesTimeline() {
  const tl = LOTE.timeline
  if (!tl) return null
  return (
    <section id="lotes" className="relative overflow-hidden border-t border-[var(--color-line)] bg-navy-glass">
      {/* brilho âmbar de fundo */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(245,166,35,0.12),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-28">
        <div className="text-center">
          <Reveal>
            <span className="badge-lote inline-flex items-center gap-2.5 rounded-full px-5 py-2 font-mono text-[0.68rem] uppercase tracking-[0.2em]">
              <span className="dot-urgency h-2 w-2 animate-urgency-pulse rounded-full" />
              {tl.eyebrow}
            </span>
          </Reveal>
          <SplitWords text={tl.headline} className="mx-auto mt-6 max-w-3xl text-[clamp(2rem,5vw,3.6rem)]" />
          <Reveal delay={0.1}>
            <p className="mx-auto mt-5 max-w-xl text-[var(--color-muted)]">{tl.sub}</p>
          </Reveal>
        </div>

        <StaggerList className="mt-14 grid gap-5 md:grid-cols-3" stagger={0.12}>
          {tl.steps.map((s) => {
            const current = s.state === 'current'
            const done = s.state === 'done'
            return (
              <div
                key={s.label}
                className={`relative flex flex-col rounded-3xl border p-7 transition-colors ${
                  current
                    ? 'border-urgency bg-gradient-to-b from-[var(--color-surface-2)] to-[var(--color-ink-2)] shadow-urgency'
                    : 'border-[var(--color-line)] bg-[var(--color-surface)]'
                } ${done ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-[0.62rem] uppercase tracking-[0.2em] ${current ? 'text-urgency' : 'text-[var(--color-muted)]'}`}>
                    {s.tag}
                  </span>
                  {current && <span className="dot-urgency h-2.5 w-2.5 animate-urgency-pulse rounded-full" />}
                </div>
                <h3 className={`mt-4 text-3xl ${current ? 'text-[var(--color-bone)]' : ''} ${done ? 'line-through decoration-[var(--color-muted)]/60' : ''}`}>
                  {s.label}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{s.desc}</p>
                <div className={`mt-6 font-display text-2xl ${current ? 'text-urgency' : 'text-[var(--color-muted)]'}`}>{s.price}</div>
              </div>
            )
          })}
        </StaggerList>
      </div>
    </section>
  )
}

/* =====================================================================
   INGRESSOS
   ===================================================================== */
function Ingressos() {
  const urgent = !!LOTE.badge // 2º lote → acento âmbar
  return (
    <section id="ingressos" className="relative overflow-hidden">
      {urgent && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_0%,rgba(245,166,35,0.13),transparent_60%)]" />
      )}
      <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
      <div className="text-center">
        <Reveal>
          <Eyebrow className="justify-center">{LOTE.eyebrow}</Eyebrow>
        </Reveal>
        <SplitWords text={LOTE.headline} className="mx-auto mt-6 max-w-3xl text-[clamp(2.2rem,5.5vw,4.5rem)]" />
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-lg text-[var(--color-muted)]">{LOTE.sub}</p>
        </Reveal>
        {LOTE.urgency && (
          <Reveal delay={0.15}>
            <span className="badge-lote mt-7 inline-flex items-center gap-2.5 rounded-full px-5 py-2 font-mono text-[0.68rem] uppercase tracking-[0.2em]">
              <span className="dot-urgency h-2 w-2 animate-urgency-pulse rounded-full" />
              {LOTE.urgency}
            </span>
          </Reveal>
        )}
      </div>

      <StaggerList className="mt-14 grid gap-5 lg:grid-cols-3" stagger={0.1}>
        {TICKETS.map((t) => (
          <div
            key={t.name}
            className={`relative flex h-full flex-col rounded-3xl border p-8 transition-transform duration-500 hover:-translate-y-1 ${
              t.featured
                ? urgent
                  ? 'border-urgency bg-gradient-to-b from-[var(--color-surface-2)] to-[var(--color-ink-2)] shadow-urgency'
                  : 'border-[var(--color-green-deep)] bg-gradient-to-b from-[var(--color-surface-2)] to-[var(--color-ink-2)] shadow-green'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] shadow-[0_14px_44px_-26px_rgba(10,31,60,0.4)]'
            }`}
          >
            {t.featured && (
              <span
                className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#07172e] ${
                  urgent ? 'bg-urgency-grad' : 'bg-green-grad'
                }`}
              >
                {urgent ? 'Melhor economia' : 'Mais procurado'}
              </span>
            )}
            <span
              className={`font-mono text-[0.62rem] uppercase tracking-[0.2em] ${urgent ? 'text-urgency' : 'text-[var(--color-green)]'}`}
            >
              {t.tier}
            </span>
            <h3 className="mt-2 text-3xl">{t.name}</h3>
            {t.prevPrice && (
              <span className="mt-5 font-mono text-sm uppercase tracking-[0.12em] text-[var(--color-muted)] line-through decoration-[var(--color-urgency)]/70">
                {t.prevPrice}
              </span>
            )}
            <div className={`font-display text-5xl text-green-metal ${t.prevPrice ? 'mt-1' : 'mt-5'}`}>{t.price}</div>
            <span className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[var(--color-muted)]">{t.note}</span>
            <ul className="mt-7 flex flex-1 flex-col gap-3">
              {t.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-3 text-sm text-[var(--color-bone)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
                    <path d="M5 12l5 5L20 6" stroke="#86c63c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {perk}
                </li>
              ))}
            </ul>
            <GoldButton
              href={`/checkout/${t.slug}`}
              size="sm"
              className="group mt-8 w-full"
              onClick={() =>
                fbTrack('AddToCart', {
                  content_type: 'product',
                  content_ids: [t.slug],
                  content_name: t.name,
                  value: t.priceValue,
                  currency: 'BRL',
                })
              }
            >
              Comprar {t.name} <Arrow />
            </GoldButton>
          </div>
        ))}
      </StaggerList>

      <Reveal delay={0.2}>
        <p className="mt-10 text-center font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Pagamento seguro via Pix ou cartão · Ingresso digital com QR enviado por e-mail e WhatsApp
        </p>
      </Reveal>
      </div>
    </section>
  )
}

/* =====================================================================
   FAQ
   ===================================================================== */
function FaqItem({ item, open, onClick }) {
  return (
    <div className="border-b border-[var(--color-line)]">
      <button onClick={onClick} className="flex w-full items-center justify-between gap-6 py-6 text-left">
        <span className="font-display text-xl uppercase text-[var(--color-bone)] sm:text-2xl">{item.q}</span>
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--color-line)] text-[var(--color-green)] transition-transform duration-300 ${
            open ? 'rotate-45 border-[var(--color-green-deep)]' : ''
          }`}
        >
          +
        </span>
      </button>
      <div className={`grid transition-all duration-500 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <p className="max-w-2xl pb-6 text-[var(--color-muted)]">{item.a}</p>
        </div>
      </div>
    </div>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="theme-light border-t border-[var(--color-line)]">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 sm:py-28 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Reveal>
            <Eyebrow>Dúvidas</Eyebrow>
          </Reveal>
          <SplitWords text="Perguntas frequentes" className="mt-6 text-[clamp(2rem,4.5vw,3.4rem)]" />
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-xs text-sm text-[var(--color-muted)]">
              Não achou sua resposta? Fale com a gente pelo{' '}
              <a href={WHATSAPP_URL} className="text-[var(--color-green-hi)] underline-offset-4 hover:underline">
                WhatsApp
              </a>
              .
            </p>
          </Reveal>
        </div>
        <div>
          {FAQ.map((item, i) => (
            <FaqItem key={item.q} item={item} open={open === i} onClick={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* =====================================================================
   CTA FINAL + FOOTER
   ===================================================================== */
function FinalCTA() {
  return (
    <section id="final" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 vignette" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 hairline" />
      <div className="relative mx-auto max-w-5xl px-5 py-28 text-center sm:px-8 sm:py-36">
        <Reveal>
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-green)]">
            {EVENT.dateFull} · {EVENT.city}
          </span>
        </Reveal>
        <SplitWords text="Seu lugar no palco natural" className="mx-auto mt-6 max-w-3xl text-[clamp(2.6rem,7vw,6rem)]" />
        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-md text-[var(--color-muted)]">{LOTE.finalCta}</p>
          <div className="mt-10 flex justify-center">
            <GoldButton href="#ingressos" className="group">
              Garantir meu ingresso <Arrow />
            </GoldButton>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-ink)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-14 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
          <img src="/brand/natural-fitness-white.svg" alt="Natural Fitness & Health Brasil" className="w-48" />
          <span className="hidden h-12 w-px bg-[var(--color-line)] sm:block" />
          <div className="flex items-center gap-3">
            <img src="/brand/wnbf-brazil.webp" alt="WNBF Brazil" loading="lazy" decoding="async" className="h-14 w-auto" />
            <div>
              <p className="font-display text-lg uppercase leading-none text-[var(--color-bone)]">
                WNBF <span className="text-green-metal">Brasil</span>
              </p>
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                World Natural Bodybuilding Federation
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start gap-4 md:items-end">
          <p className="max-w-xs text-sm text-[var(--color-muted)] md:text-right">
            {EVENT.name} {EVENT.edition} · {EVENT.dateFull} · {EVENT.city}.
          </p>
          <GhostButton href="#ingressos">Ingressos</GhostButton>
        </div>
      </div>
      <div className="border-t border-[var(--color-line)] py-5 text-center font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted)]">
        © {EVENT.edition} WNBF Brasil — Todos os direitos reservados
      </div>
    </footer>
  )
}

/* =====================================================================
   APP
   ===================================================================== */
export default function App() {
  useSmoothScroll()
  const rich = useRichVisuals()
  const { hash } = useLocation()

  // Ao chegar com âncora (ex.: voltar do /checkout para /#ingressos),
  // rola suavemente até a seção depois que o Lenis inicializa.
  useEffect(() => {
    if (!hash) return
    const id = setTimeout(() => scrollTo(hash), 450)
    return () => clearTimeout(id)
  }, [hash])

  return (
    <div className="grain relative">
      <Nav />
      <main>
        <Hero rich={rich} />
        <Marquee />
        <Evento />
        <Natural />
        <Categorias />
        <ParaQuem />
        <Faq />
        <LotesTimeline />
        <Ingressos />
        <Localizacao />
        <FinalCTA />
      </main>
      <Footer />
      <StickyCTA />
      {/* Emblema 3D (WebGL) só no desktop: em mobile o loop de render derruba o
          TBT. Lá usamos o emblema estático em SVG (ver Hero). */}
      {rich && (
        <Suspense fallback={null}>
          <FloatingEmblem />
        </Suspense>
      )}
    </div>
  )
}
