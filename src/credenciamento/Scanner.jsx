import { useCallback, useEffect, useRef, useState } from 'react'
import { useScanner } from './lib/useScanner'
import { validateTicket, flushQueue } from './lib/validation'
import { syncDown } from './lib/credApi'
import { saveCache, getQueue, getSyncedAt } from './lib/store'
import { feedback } from './lib/feedback'
import { isDemo, demoStats } from './lib/demo'
import Result from './Result'

/* ---------- ícones ---------- */
const Ic = {
  bolt: (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22" {...p}>
      <path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  keyboard: (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22" {...p}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  sync: (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" {...p}>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  logout: (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" {...p}>
      <path d="M15 12H4m0 0l4-4m-4 4l4 4M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

function Stat({ n, label, tint }) {
  return (
    <div className="text-center">
      <div className="font-display text-2xl leading-none" style={{ color: tint }}>{n}</div>
      <div className="mt-1 font-mono text-[0.52rem] uppercase tracking-[0.14em] text-white/50">{label}</div>
    </div>
  )
}

export default function Scanner({ user, online, onLogout }) {
  const [result, setResult] = useState(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [stats, setStats] = useState(null)
  const [syncedAt, setSyncedAt] = useState(getSyncedAt())
  const [pending, setPending] = useState(getQueue().length)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState('')
  const busyRef = useRef(false)

  const paused = !!result || manualOpen
  const { videoRef, canvasRef, status, retry, torchSupported, torchOn, toggleTorch } = useScanner({
    onDetect: (raw) => handle(raw),
    paused,
  })

  const flash = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  const refreshDown = useCallback(async () => {
    const data = await syncDown()
    saveCache(data.tickets, data.server_time)
    setStats(data.stats)
    setSyncedAt(data.server_time)
  }, [])

  const doSync = useCallback(async () => {
    if (isDemo()) {
      setStats(demoStats())
      return
    }
    if (syncing || !navigator.onLine) return
    setSyncing(true)
    try {
      const flushed = await flushQueue()
      setPending(getQueue().length)
      await refreshDown()
      if (flushed.conflicts) flash(`${flushed.conflicts} ingresso(s) já usado(s) em outro ponto.`)
    } catch {
      /* silencioso — segue offline */
    } finally {
      setSyncing(false)
    }
  }, [syncing, refreshDown])

  // sincroniza ao abrir e quando a rede volta
  useEffect(() => {
    if (online) doSync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const handle = useCallback(
    async (raw) => {
      if (busyRef.current) return
      busyRef.current = true
      try {
        const data = await validateTicket(raw)
        feedback(data.result)
        setResult(data)
        setPending(getQueue().length)
        // otimização de UI: refletir contagem local imediatamente
        if (data.result === 'approved') {
          setStats((s) => (s ? { ...s, checked_in: s.checked_in + 1, remaining: Math.max(0, s.remaining - 1) } : s))
        }
      } catch (err) {
        if (err.status === 401) return onLogout()
        setResult({ result: 'invalid', message: err.message || 'Falha ao validar.', ticket: null })
      } finally {
        busyRef.current = false
      }
    },
    [onLogout],
  )

  const closeResult = () => setResult(null)

  const submitManual = (e) => {
    e.preventDefault()
    const code = manualCode.trim()
    if (!code) return
    setManualOpen(false)
    setManualCode('')
    handle(code)
  }

  const relSync = syncedAt
    ? new Date(syncedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div className="relative h-[100svh] w-full overflow-hidden bg-black">
      {/* câmera */}
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline autoPlay />
      <canvas ref={canvasRef} hidden />

      {/* escurece o fundo, deixando o "recorte" central mais claro */}
      <div className="pointer-events-none absolute inset-0 bg-black/45" />

      {/* ---------- TOPO ---------- */}
      <div className="absolute inset-x-0 top-0 z-20 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/45 px-4 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/brand/wnbf-logo.png" alt="" className="h-7 w-auto" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-white/50">Credenciamento</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.56rem] uppercase tracking-[0.12em] ${
                online ? 'bg-[#86c63c]/20 text-[#a8e35d]' : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-[#86c63c]' : 'bg-amber-400'}`} />
              {online ? 'Online' : 'Offline'}
            </span>
            <button
              onClick={doSync}
              disabled={!online || syncing}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/80 disabled:opacity-40"
              aria-label="Sincronizar"
            >
              <span className={syncing ? 'animate-cred-spin' : ''}>{Ic.sync()}</span>
            </button>
            <button
              onClick={onLogout}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/80"
              aria-label="Sair"
            >
              {Ic.logout()}
            </button>
          </div>
        </div>

        {/* estatísticas */}
        {stats && (
          <div className="mt-2 flex items-center justify-around rounded-2xl bg-black/40 px-4 py-2 backdrop-blur-md">
            <Stat n={stats.checked_in} label="Validados" tint="#a8e35d" />
            <span className="h-6 w-px bg-white/15" />
            <Stat n={stats.remaining} label="Restantes" tint="#eef3f9" />
            <span className="h-6 w-px bg-white/15" />
            <Stat n={stats.total} label="Total" tint="#9bb1cd" />
          </div>
        )}
      </div>

      {/* ---------- VISOR CENTRAL ---------- */}
      <div className="absolute inset-0 z-10 flex items-center justify-center px-10">
        <div className="relative aspect-square w-full max-w-[300px]">
          {/* recorte "claro" (sem o escurecimento) via sombra enorme */}
          <div className="absolute inset-0 rounded-[2rem] shadow-[0_0_0_100vmax_rgba(0,0,0,0.35)]" />
          {/* cantos */}
          {[
            'left-0 top-0 border-l-4 border-t-4 rounded-tl-[2rem]',
            'right-0 top-0 border-r-4 border-t-4 rounded-tr-[2rem]',
            'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-[2rem]',
            'right-0 bottom-0 border-r-4 border-b-4 rounded-br-[2rem]',
          ].map((c) => (
            <span key={c} className={`absolute h-10 w-10 border-[#86c63c] ${c}`} />
          ))}
          {/* linha de varredura */}
          {status === 'running' && !paused && (
            <div className="absolute inset-x-3 top-3 bottom-3 overflow-hidden rounded-2xl">
              <div className="animate-cred-scan h-[3px] w-full bg-gradient-to-r from-transparent via-[#a8e35d] to-transparent shadow-[0_0_16px_2px_rgba(134,198,60,0.7)]" />
            </div>
          )}
        </div>
      </div>

      {/* estado da câmera (permissão / erro) */}
      {status !== 'running' && (
        <div className="absolute inset-0 z-10 grid place-items-center px-8 text-center">
          <div className="max-w-xs rounded-2xl bg-black/70 p-6 backdrop-blur-md">
            {status === 'starting' && <p className="text-white/80">Abrindo a câmera…</p>}
            {status === 'denied' && (
              <>
                <p className="text-lg font-semibold text-white">Câmera bloqueada</p>
                <p className="mt-2 text-sm text-white/70">
                  Autorize o acesso à câmera nas configurações do navegador e toque em tentar de novo.
                </p>
              </>
            )}
            {status === 'insecure' && (
              <>
                <p className="text-lg font-semibold text-white">Conexão não segura</p>
                <p className="mt-2 text-sm text-white/70">
                  A câmera só funciona em HTTPS (ou localhost). Abra o app por um endereço seguro.
                </p>
              </>
            )}
            {status === 'error' && (
              <>
                <p className="text-lg font-semibold text-white">Não foi possível abrir a câmera</p>
                <p className="mt-2 text-sm text-white/70">Verifique se outro app está usando a câmera.</p>
              </>
            )}
            {status !== 'starting' && status !== 'insecure' && (
              <button
                onClick={retry}
                className="mt-4 rounded-full bg-green-grad px-6 py-2.5 font-display text-sm uppercase tracking-wide text-[#07172e]"
              >
                Tentar de novo
              </button>
            )}
            <p className="mt-4 text-xs text-white/60">Você ainda pode validar digitando o código.</p>
          </div>
        </div>
      )}

      {/* dica */}
      <p className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] z-10 text-center font-mono text-[0.62rem] uppercase tracking-[0.16em] text-white/70">
        Aponte para o QR Code do ingresso
      </p>

      {/* ---------- BARRA INFERIOR ---------- */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setManualOpen(true)}
            className="flex items-center gap-2 rounded-full bg-white/95 px-6 py-3.5 font-display text-base uppercase tracking-wide text-[#07172e] shadow-lg active:scale-[0.98]"
          >
            {Ic.keyboard({ width: 20, height: 20 })} Digitar código
          </button>
          {torchSupported && (
            <button
              onClick={toggleTorch}
              className={`grid h-[3.25rem] w-[3.25rem] place-items-center rounded-full backdrop-blur-md active:scale-95 ${
                torchOn ? 'bg-[#86c63c] text-[#07172e]' : 'bg-white/15 text-white'
              }`}
              aria-label="Lanterna"
            >
              {Ic.bolt()}
            </button>
          )}
        </div>
        <p className="mt-3 text-center font-mono text-[0.55rem] uppercase tracking-[0.14em] text-white/45">
          Sincronizado {relSync}
          {pending > 0 ? ` · ${pending} na fila` : ''}
        </p>
      </div>

      {/* toast */}
      {toast && (
        <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+7rem)] z-30 flex justify-center px-4">
          <p className="rounded-full bg-amber-500/95 px-4 py-2 text-sm font-medium text-[#3a1d00] shadow-lg">{toast}</p>
        </div>
      )}

      {/* ---------- MODAL: digitar código ---------- */}
      {manualOpen && (
        <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
          <form
            onSubmit={submitManual}
            className="w-full max-w-sm rounded-t-3xl bg-[var(--color-ink-2)] p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:rounded-3xl [animation:credRise_.25s_ease]"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
            <p className="eyebrow">Validação manual</p>
            <h3 className="mt-1 text-2xl">Digite o código do ingresso</h3>
            <input
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="NF-XXXX-XXXX-XXXX"
              className="mt-4 w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-ink)] px-4 py-4 text-center font-mono text-lg tracking-[0.12em] text-[var(--color-bone)] outline-none focus:border-[var(--color-green)]"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setManualOpen(false)
                  setManualCode('')
                }}
                className="flex-1 rounded-full border border-[var(--color-line)] py-3.5 font-display uppercase tracking-wide text-[var(--color-bone)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 rounded-full bg-green-grad py-3.5 font-display uppercase tracking-wide text-[#07172e]"
              >
                Validar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------- RESULTADO ---------- */}
      {result && <Result data={result} onNext={closeResult} />}
    </div>
  )
}
