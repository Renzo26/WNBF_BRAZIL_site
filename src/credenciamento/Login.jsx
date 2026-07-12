import { useState } from 'react'
import { login as apiLogin } from './lib/credApi'

export default function Login({ onLogged, onDemo }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      const data = await apiLogin(username.trim(), password)
      onLogged(data.access_token, data.user)
    } catch (err) {
      setError(err.message || 'Não foi possível entrar.')
      setLoading(false)
    }
  }

  const input =
    'w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-ink-2)] px-4 py-4 text-[15px] text-[var(--color-bone)] outline-none transition-colors placeholder:text-[var(--color-muted)]/50 focus:border-[var(--color-green)] focus:ring-2 focus:ring-[var(--color-green)]/25'

  return (
    <div className="relative grid min-h-[100svh] place-items-center overflow-hidden px-6 py-10">
      {/* fundo */}
      <div className="pointer-events-none absolute inset-0 vignette" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,rgba(134,198,60,0.18),transparent_60%)]" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <img src="/brand/wnbf-logo.png" alt="WNBF Brasil" className="h-16 w-auto drop-shadow-[0_0_28px_rgba(134,198,60,0.28)]" />
          <p className="eyebrow mt-6">Credenciamento</p>
          <h1 className="mt-2 text-[clamp(2rem,9vw,2.6rem)] leading-[0.9]">Acesso da equipe</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Entre para validar ingressos na entrada do evento.
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <div>
            <label htmlFor="u" className="mb-1.5 block font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Usuário
            </label>
            <input
              id="u"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              placeholder="seu.usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={input}
            />
          </div>

          <div>
            <label htmlFor="p" className="mb-1.5 block font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Senha
            </label>
            <div className="relative">
              <input
                id="p"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={input}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--color-green)]"
              >
                {show ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-[#e5646a]/40 bg-[#e5646a]/10 px-4 py-3 text-sm text-[#ff8f93]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-green-grad px-8 py-4 font-display text-lg uppercase tracking-wide text-[#07172e] shadow-green transition-opacity disabled:opacity-70"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          {onDemo && (
            <button
              type="button"
              onClick={onDemo}
              className="mt-1 w-full rounded-full border border-[var(--color-line)] py-3 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--color-muted)] transition-colors hover:border-[var(--color-green)] hover:text-[var(--color-green-hi)]"
            >
              Entrar em modo demonstração
            </button>
          )}
        </form>

        <p className="mt-8 text-center font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[var(--color-muted)]">
          WNBF Brasil · Natural Fitness &amp; Health 2026
        </p>
      </div>
    </div>
  )
}
