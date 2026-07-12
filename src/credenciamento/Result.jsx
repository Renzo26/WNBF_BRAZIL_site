/* Overlay de resultado — grande e legível à distância, para a portaria. */

const CONFIG = {
  approved: {
    bg: 'linear-gradient(165deg,#5f9a2c 0%,#3f6b1c 100%)',
    accent: '#c6f08a',
    word: 'Liberado',
    icon: (
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  duplicate: {
    bg: 'linear-gradient(165deg,#b45309 0%,#7c2d12 100%)',
    accent: '#fcd34d',
    word: 'Já usado',
    icon: (
      <>
        <path d="M12 7v6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="12" cy="17" r="0.4" fill="currentColor" stroke="currentColor" strokeWidth="2" />
      </>
    ),
  },
  canceled: {
    bg: 'linear-gradient(165deg,#b91c1c 0%,#7f1d1d 100%)',
    accent: '#fca5a5',
    word: 'Cancelado',
    icon: <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />,
  },
  invalid: {
    bg: 'linear-gradient(165deg,#b91c1c 0%,#7f1d1d 100%)',
    accent: '#fca5a5',
    word: 'Inválido',
    icon: <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />,
  },
}

function timeOf(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return null
  }
}

export default function Result({ data, onNext }) {
  const cfg = CONFIG[data.result] || CONFIG.invalid
  const t = data.ticket
  const usedAt = data.result === 'duplicate' ? timeOf(t?.checked_in_at) : null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+2rem)] text-white [animation:credRise_.28s_cubic-bezier(.2,.9,.3,1)]"
      style={{ background: cfg.bg }}
      onClick={onNext}
      role="button"
      tabIndex={0}
    >
      {data.offline && (
        <span className="mx-auto rounded-full bg-black/25 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.18em]">
          Offline · sincroniza depois
        </span>
      )}

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div
          className="grid h-28 w-28 place-items-center rounded-full bg-white/15 [animation:credPop_.35s_cubic-bezier(.2,1.3,.4,1)]"
          style={{ color: cfg.accent }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-16 w-16">
            {cfg.icon}
          </svg>
        </div>

        <h2 className="mt-6 font-display text-[clamp(3rem,16vw,5.5rem)] uppercase leading-[0.85]">{cfg.word}</h2>
        <p className="mt-2 text-lg text-white/85">{data.message}</p>

        {t && (
          <div className="mt-8 w-full max-w-sm rounded-3xl bg-black/20 p-6 backdrop-blur-sm">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-white/60">Portador</p>
            <p className="mt-1 text-2xl font-semibold leading-tight">{t.holder_name}</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t.ticket_name}</span>
            </div>
            <p className="mt-3 font-mono text-xs tracking-[0.12em] text-white/55">{t.code}</p>
            {usedAt && (
              <p className="mt-3 border-t border-white/15 pt-3 text-sm text-white/80">
                Validado às <strong>{usedAt}</strong>
                {t.checked_in_by ? ` · ${t.checked_in_by}` : ''}
              </p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-4 w-full rounded-full bg-white/95 py-4 font-display text-lg uppercase tracking-wide text-[#07172e] active:scale-[0.99]"
      >
        Próximo
      </button>
    </div>
  )
}
