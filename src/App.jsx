import { lazy, Suspense, useEffect, useRef, useState } from 'react'
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
import { useSmoothScroll } from './lib/smooth'
import { useRichVisuals } from './lib/device'
import { CATEGORIES, EVENT, FAQ, TICKETS, TICKET_URL, WHATSAPP_URL } from './data'

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

        <div className="hero-fade mt-7">
          <GoldButton href={TICKET_URL} size="sm" className="group">
            Garantir ingresso — 1º lote <Arrow />
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
  const items = ['100% DRUG-FREE', 'POLÍGRAFO OBRIGATÓRIO', 'EXAME WADA', 'WNBF CHAMPIONSHIPS', 'NATURAL FITNESS EXPO', '10·11 OUT 2026']
  const row = [...items, ...items]
  return (
    <div className="overflow-hidden border-y border-[var(--color-line)] bg-navy-glass py-4">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-10 font-display text-lg uppercase tracking-wide text-[var(--color-muted)]">
            {t}
            <span className="text-[var(--color-green-deep)]">✦</span>
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
    <section id="evento">
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
   INGRESSOS
   ===================================================================== */
function Ingressos() {
  return (
    <section id="ingressos" className="theme-light">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
      <div className="text-center">
        <Reveal>
          <Eyebrow className="justify-center">Ingressos · 1º Lote</Eyebrow>
        </Reveal>
        <SplitWords text="O menor preço é agora" className="mx-auto mt-6 max-w-3xl text-[clamp(2.2rem,5.5vw,4.5rem)]" />
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-lg text-[var(--color-muted)]">
            O 1º lote tem quantidade limitada e o valor sobe conforme as vagas se esgotam. Garanta seu lugar antes da
            virada de lote.
          </p>
        </Reveal>
      </div>

      <StaggerList className="mt-14 grid gap-5 lg:grid-cols-3" stagger={0.1}>
        {TICKETS.map((t) => (
          <div
            key={t.name}
            className={`relative flex h-full flex-col rounded-3xl border p-8 transition-transform duration-500 hover:-translate-y-1 ${
              t.featured
                ? 'border-[var(--color-green-deep)] bg-gradient-to-b from-[var(--color-surface-2)] to-[var(--color-ink-2)] shadow-green'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] shadow-[0_14px_44px_-26px_rgba(10,31,60,0.4)]'
            }`}
          >
            {t.featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-grad px-4 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#07172e]">
                Mais procurado
              </span>
            )}
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-[var(--color-green)]">{t.tier}</span>
            <h3 className="mt-2 text-3xl">{t.name}</h3>
            <div className="mt-5 font-display text-5xl text-green-metal">{t.price}</div>
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
            <GoldButton href={TICKET_URL} size="sm" className="group mt-8 w-full">
              Comprar {t.name} <Arrow />
            </GoldButton>
          </div>
        ))}
      </StaggerList>

      <Reveal delay={0.2}>
        <p className="mt-10 text-center font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Pagamento seguro via Uticket · Ingresso digital enviado por e-mail
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
          <p className="mx-auto mt-6 max-w-md text-[var(--color-muted)]">
            O 1º lote não espera. Garanta o menor preço e esteja onde o físico de verdade é celebrado.
          </p>
          <div className="mt-10 flex justify-center">
            <GoldButton href={TICKET_URL} className="group">
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
          <GhostButton href={TICKET_URL}>Ingressos</GhostButton>
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
  return (
    <div className="grain relative">
      <Nav />
      <main>
        <Hero rich={rich} />
        <Ingressos />
        <Marquee />
        <Evento />
        <Natural />
        <Categorias />
        <ParaQuem />
        <Faq />
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
