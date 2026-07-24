import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EVENT, getTicketBySlug, serviceFee } from '../data'
import { postCheckout } from '../lib/api'
import { fbTrack } from '../lib/fpixel'
import { buildTicketPng, makeQrDataUrl } from '../lib/ticket'
import { brl, formatCard, formatCep, formatDoc, formatExpiry, formatPhone, onlyDigits } from '../lib/format'
import {
  isValidCardNumber,
  isValidCep,
  isValidCvv,
  isValidDoc,
  isValidEmail,
  isValidExpiry,
  isValidPhone,
} from '../lib/validators'

/* =====================================================================
   CHECKOUT — /checkout/:slug
   -----------------------------------------------------------------------
   Tela de pagamento (UI/UX). A cobrança em si depende de um gateway
   (Pix/cartão) no backend — aqui a submissão é simulada e a tela de
   confirmação demonstra o próximo passo. Ponto de integração marcado
   em `handleSubmit`.
   ===================================================================== */

/* ---------- ícones ---------- */
const Ic = {
  lock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16" {...p}>
      <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  pix: (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="20" height="20" {...p}>
      <path
        d="M12 3.5 20.5 12 12 20.5 3.5 12 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 8.5 15.5 12 12 15.5 8.5 12 12 8.5Z" fill="currentColor" opacity="0.9" />
    </svg>
  ),
  card: (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="20" height="20" {...p}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2.5 9.5h19" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="20" height="20" {...p}>
      <path d="M5 12l5 5L20 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  back: (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" {...p}>
      <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevron: (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" {...p}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  download: (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" {...p}>
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  whatsapp: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" {...p}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm5.8 14.06c-.24.68-1.42 1.31-1.95 1.36-.5.05-1.13.07-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-2.99 0-1.42.75-2.12 1.01-2.41.26-.29.57-.36.76-.36l.55.01c.18.01.41-.07.64.49.24.57.81 1.99.88 2.13.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.72 1.18 1.54 1.92 1.06.94 1.95 1.24 2.23 1.38.28.14.44.12.6-.07.16-.19.69-.8.87-1.08.18-.28.36-.23.61-.14.25.09 1.6.76 1.87.9.28.14.46.21.53.33.07.12.07.68-.17 1.35Z" />
    </svg>
  ),
}

/* Detecção simples da bandeira para dar feedback visual. */
function cardBrand(number) {
  const d = number.replace(/\D/g, '')
  if (/^4/.test(d)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard'
  if (/^3[47]/.test(d)) return 'Amex'
  if (/^(4011|4312|4389|504175|5067|5090|6277|6362|6363|650|651|655)/.test(d)) return 'Elo'
  return ''
}

const inputCls = (hasError) =>
  `w-full rounded-xl border bg-[var(--color-ink-2)] px-4 py-3.5 text-[15px] text-[var(--color-bone)] outline-none transition-colors placeholder:text-[var(--color-muted)]/50 focus:ring-2 focus:ring-[var(--color-green)]/25 ${
    hasError ? 'border-[#e5646a] focus:border-[#e5646a]' : 'border-[var(--color-line)] focus:border-[var(--color-green)]'
  }`

/* ---------- campo com label + erro ---------- */
function Field({ id, label, error, children, hint }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-mono text-[0.68rem] uppercase tracking-[0.15em] text-[var(--color-muted)]">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-[#ff8f93]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[var(--color-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}

/* ---------- resumo do pedido ---------- */
function OrderSummary({ ticket, fee, total, collapsible = false }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]/60">
      {collapsible && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 lg:hidden"
        >
          <span className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-[var(--color-green)]">
            <Ic.chevron className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            Resumo do pedido
          </span>
          <span className="font-display text-xl text-green-metal">{brl(total)}</span>
        </button>
      )}

      <div className={`${collapsible ? `${open ? 'block' : 'hidden'} lg:block` : 'block'}`}>
        <div className="border-t border-[var(--color-line)] p-5 lg:border-t-0">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--color-line)] bg-[var(--color-ink-2)]">
              <img src="/brand/wnbf-logo.png" alt="" className="h-8 w-auto" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--color-green)]">{ticket.tier}</p>
              <h3 className="mt-0.5 text-xl leading-tight">{ticket.name}</h3>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">{EVENT.dateFull}</p>
            </div>
          </div>

          <dl className="mt-6 space-y-2.5 text-sm">
            <div className="flex justify-between text-[var(--color-muted)]">
              <dt>Ingresso · 1 un.</dt>
              <dd className="text-[var(--color-bone)]">{brl(ticket.priceValue)}</dd>
            </div>
            <div className="flex justify-between text-[var(--color-muted)]">
              <dt>Taxa de serviço</dt>
              <dd className="text-[var(--color-bone)]">{brl(fee)}</dd>
            </div>
          </dl>

          <div className="mt-4 flex items-end justify-between border-t border-[var(--color-line)] pt-4">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-[var(--color-muted)]">Total</span>
            <span className="font-display text-3xl text-green-metal">{brl(total)}</span>
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs text-[var(--color-muted)]">
            {Ic.check({ width: 15, height: 15, className: 'text-[var(--color-green)]' })}
            Ingresso digital enviado por e-mail
          </p>
        </div>
      </div>
    </div>
  )
}

/* =====================================================================
   Página
   ===================================================================== */
export default function Checkout() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const ticket = getTicketBySlug(slug)

  const [form, setForm] = useState({
    name: '',
    email: '',
    emailConfirm: '',
    doc: '',
    phone: '',
    cep: '',
    logradouro: '',
    number: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    method: 'pix',
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: '',
    installments: '1',
    consent: false,
  })
  const [touched, setTouched] = useState({})
  const [cepStatus, setCepStatus] = useState('idle') // idle | loading | ok | notfound | error
  const [status, setStatus] = useState('form') // 'form' | 'processing' | 'success'
  const [result, setResult] = useState(null)     // resposta do backend
  const [apiError, setApiError] = useState('')
  const [idemKey] = useState(() => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : String(Date.now())))
  const [copied, setCopied] = useState(false)
  const [ticketQr, setTicketQr] = useState('') // QR do ingresso (data URL)

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = ticket ? `Checkout · ${ticket.name} — WNBF Brasil` : 'Checkout — WNBF Brasil'
  }, [ticket])

  // Gera o QR do ingresso assim que o pagamento é confirmado.
  // Usa o token ASSINADO vindo do backend (validável na portaria); se por algum
  // motivo não vier, cai para o id do pedido apenas como fallback visual.
  useEffect(() => {
    if (status === 'success' && result?.status === 'PAID') {
      const token = result.tickets?.[0]?.qr_token || `WNBF-INGRESSO:${result.order_id}`
      makeQrDataUrl(token).then(setTicketQr).catch(() => {})
    }
  }, [status, result])

  // Meta Pixel: compra confirmada NA HORA (cartão). No Pix o cliente sai do site
  // e a confirmação chega pelo webhook — por isso esse Purchase é enviado também
  // pelo backend (Conversions API). O eventID (= pedido) deduplica os dois lados.
  const purchaseSent = useRef(false)
  useEffect(() => {
    if (status === 'success' && result?.status === 'PAID' && !purchaseSent.current) {
      purchaseSent.current = true
      fbTrack(
        'Purchase',
        {
          value: (result.total_amount ?? 0) / 100,
          currency: 'BRL',
          content_name: ticket?.name,
          content_ids: [slug],
          content_type: 'product',
        },
        { eventID: result.order_id },
      )
    }
  }, [status, result, ticket, slug])

  // Autopreenchimento de endereço pela ViaCEP quando o CEP fica completo.
  useEffect(() => {
    const digits = onlyDigits(form.cep)
    if (digits.length !== 8) {
      setCepStatus('idle')
      return
    }
    let cancelled = false
    setCepStatus('loading')
    fetch(`https://viacep.com.br/ws/${digits}/json/`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.erro) {
          setCepStatus('notfound')
          return
        }
        setForm((f) => ({
          ...f,
          logradouro: data.logradouro || f.logradouro,
          bairro: data.bairro || f.bairro,
          cidade: data.localidade || f.cidade,
          uf: data.uf || f.uf,
        }))
        setCepStatus('ok')
        // leva o foco direto para o número (rua já preenchida)
        document.getElementById('number')?.focus()
      })
      .catch(() => {
        if (!cancelled) setCepStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [form.cep])

  const fee = ticket ? serviceFee(ticket.priceValue, form.method) : 0
  const total = ticket ? ticket.priceValue + fee : 0

  const errors = useMemo(() => {
    const e = {}
    if (form.name.trim().split(/\s+/).filter(Boolean).length < 2) e.name = 'Informe seu nome completo'
    if (!isValidEmail(form.email)) e.email = 'E-mail inválido'
    if (form.emailConfirm.trim().toLowerCase() !== form.email.trim().toLowerCase())
      e.emailConfirm = 'Os e-mails não coincidem'
    if (!isValidDoc(form.doc)) e.doc = 'CPF ou CNPJ inválido'
    if (!isValidPhone(form.phone)) e.phone = 'Celular inválido'
    if (!isValidCep(form.cep)) e.cep = 'CEP inválido'
    if (!form.logradouro.trim()) e.logradouro = 'Informe o endereço'
    if (!form.number.trim()) e.number = 'Nº'
    if (!form.bairro.trim()) e.bairro = 'Informe o bairro'
    if (!form.cidade.trim()) e.cidade = 'Informe a cidade'
    if (form.uf.trim().length !== 2) e.uf = 'UF'
    if (form.method === 'card') {
      if (!isValidCardNumber(form.cardNumber)) e.cardNumber = 'Número do cartão inválido'
      if (!form.cardName.trim()) e.cardName = 'Informe o nome impresso'
      if (!isValidExpiry(form.cardExpiry)) e.cardExpiry = 'Validade inválida'
      if (!isValidCvv(form.cardCvv)) e.cardCvv = 'CVV inválido'
    }
    if (!form.consent) e.consent = 'É necessário aceitar os termos e a política de privacidade'
    return e
  }, [form])

  // aplica máscara conforme o campo
  const masks = {
    doc: formatDoc,
    phone: formatPhone,
    cep: formatCep,
    cardNumber: formatCard,
    cardExpiry: formatExpiry,
  }
  const setField = (key) => (ev) => {
    const raw = ev.target.value
    const value = masks[key] ? masks[key](raw) : raw
    setForm((f) => ({ ...f, [key]: value }))
  }
  const blur = (key) => () => setTouched((t) => ({ ...t, [key]: true }))
  const err = (key) => (touched[key] ? errors[key] : undefined)

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (Object.keys(errors).length > 0) {
      // marca todos como tocados p/ revelar os erros e leva ao 1º inválido
      setTouched({
        name: 1, email: 1, emailConfirm: 1, doc: 1, phone: 1,
        cep: 1, logradouro: 1, number: 1, bairro: 1, cidade: 1, uf: 1,
        cardNumber: 1, cardName: 1, cardExpiry: 1, cardCvv: 1, consent: 1,
      })
      const first = document.querySelector('[aria-invalid="true"]')
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      first?.focus?.({ preventScroll: true })
      return
    }

    // Meta Pixel: início real do pagamento (clique em "Pagar").
    fbTrack('InitiateCheckout', {
      value: total,
      currency: 'BRL',
      content_type: 'product',
      content_ids: [slug],
      content_name: ticket?.name,
    })

    setApiError('')
    setStatus('processing')
    try {
      const payload = {
        ticket_slug: slug,
        name: form.name,
        email: form.email,
        email_confirm: form.emailConfirm,
        doc: form.doc,
        phone: form.phone,
        address: {
          cep: form.cep,
          logradouro: form.logradouro,
          number: form.number,
          complemento: form.complemento || null,
          bairro: form.bairro,
          cidade: form.cidade,
          uf: form.uf,
        },
        method: form.method,
        installments: form.method === 'card' ? Number(form.installments) : 1,
        card:
          form.method === 'card'
            ? { number: form.cardNumber, holder_name: form.cardName, expiry: form.cardExpiry, cvv: form.cardCvv }
            : null,
        consent: form.consent,
      }
      const data = await postCheckout(payload, idemKey)
      setResult(data)
      setStatus('success')
    } catch (e) {
      setApiError(e.message)
      setStatus('form')
    }
  }

  /* ---------- ingresso inexistente ---------- */
  if (!ticket) {
    return (
      <div className="grid min-h-[100svh] place-items-center px-6 text-center">
        <div>
          <p className="eyebrow">Ingresso não encontrado</p>
          <h1 className="mt-4 text-4xl">Ops, esse ingresso não existe</h1>
          <p className="mx-auto mt-4 max-w-sm text-[var(--color-muted)]">
            O ingresso que você tentou acessar não está disponível. Volte e escolha uma das opções disponíveis.
          </p>
          <Link
            to="/#ingressos"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-green-grad px-7 py-3.5 font-display uppercase tracking-wide text-[#07172e]"
          >
            Ver ingressos
          </Link>
        </div>
      </div>
    )
  }

  /* ---------- confirmação ---------- */
  if (status === 'success' && result) {
    const paid = result.status === 'PAID'
    const pix = result.pix
    const showPixQr = !paid && result.method === 'PIX' && pix?.qr_image
    const pixUnavailable = !paid && result.method === 'PIX' && !pix?.qr_image
    const copyPix = async () => {
      if (!pix?.copy_paste) return
      try {
        await navigator.clipboard.writeText(pix.copy_paste)
        setCopied(true)
        setTimeout(() => setCopied(false), 2200)
      } catch {
        /* clipboard indisponível */
      }
    }
    const downloadTicket = async () => {
      if (!ticketQr) return
      try {
        const png = await buildTicketPng({
          eventDate: '10 e 11 OUT 2026',
          ticketName: ticket.name,
          buyerName: form.name,
          orderId: result.order_id.slice(0, 8),
          total: result.total_formatted,
          qrDataUrl: ticketQr,
        })
        const a = document.createElement('a')
        a.href = png
        a.download = `ingresso-wnbf-${result.order_id.slice(0, 8)}.png`
        document.body.appendChild(a)
        a.click()
        a.remove()
      } catch {
        /* falha ao gerar o ingresso */
      }
    }

    return (
      <div className="mx-auto min-h-[100svh] max-w-lg px-5 py-14 sm:py-20">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-grad text-[#07172e] shadow-green">
            {Ic.check({ width: 30, height: 30 })}
          </div>
          <h1 className="mt-6 text-3xl sm:text-4xl">
            {paid ? 'Pagamento confirmado!' : pixUnavailable ? 'Pedido registrado' : 'Quase lá!'}
          </h1>
          <p className="mt-3 text-[var(--color-muted)]">
            {paid
              ? `Tudo certo, ${form.name.split(' ')[0]}! Enviamos a confirmação e o ingresso para o seu e-mail e WhatsApp.`
              : pixUnavailable
                ? 'Não foi possível gerar o Pix agora. Seu pedido foi registrado — tente novamente em alguns instantes ou fale com a organização.'
                : 'Escaneie o QR Code ou copie o código para concluir o pagamento via Pix.'}
          </p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-green)]">
            Pedido {result.order_id?.slice(0, 8)} · {result.total_formatted}
          </p>
        </div>

        {paid && (
          <>
            {/* confirmação enviada no WhatsApp */}
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#25D366] text-white">
                {Ic.whatsapp()}
              </span>
              <p className="text-sm text-[var(--color-bone)]">
                Confirmação de pagamento enviada no seu WhatsApp{' '}
                <strong className="whitespace-nowrap">{form.phone}</strong>
              </p>
            </div>

            {/* ingresso com QR Code */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]/60">
              <div className="flex items-center justify-between bg-green-grad px-5 py-3">
                <span className="font-display uppercase tracking-wide text-[#07172e]">Seu ingresso</span>
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[#07172e]/80">WNBF · 2026</span>
              </div>
              <div className="p-6 text-center">
                {ticketQr ? (
                  <img src={ticketQr} alt="QR Code do ingresso" className="mx-auto h-48 w-48 rounded-xl bg-white p-2" />
                ) : (
                  <div className="mx-auto h-48 w-48 animate-pulse rounded-xl bg-[var(--color-ink-2)]" />
                )}
                <h3 className="mt-4 text-2xl">{ticket.name}</h3>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{form.name}</p>
                {result.tickets?.[0]?.code && (
                  <p className="mt-2 font-mono text-sm tracking-[0.12em] text-[var(--color-bone)]">
                    {result.tickets[0].code}
                  </p>
                )}
                <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[var(--color-green)]">
                  Pedido {result.order_id?.slice(0, 8)} · {result.total_formatted}
                </p>
                <p className="mt-4 text-xs text-[var(--color-muted)]">Apresente este QR Code na entrada do evento</p>
              </div>
            </div>

            <button
              type="button"
              onClick={downloadTicket}
              disabled={!ticketQr}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-green-grad px-8 py-4 font-display text-base uppercase tracking-wide text-[#07172e] shadow-green transition-opacity disabled:opacity-60"
            >
              {Ic.download()} Baixar ingresso
            </button>
          </>
        )}

        {showPixQr && (
          <div className="mt-8 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]/60 p-6 text-center">
            <img src={pix.qr_image} alt="QR Code Pix" className="mx-auto h-44 w-44 rounded-xl bg-white p-2" />
            <p className="mt-4 text-2xl font-display text-green-metal">{result.total_formatted}</p>
            <div className="mt-5 flex items-stretch gap-2">
              <input
                readOnly
                value={pix.copy_paste || ''}
                className="min-w-0 flex-1 truncate rounded-xl border border-[var(--color-line)] bg-[var(--color-ink-2)] px-3 py-3 text-xs text-[var(--color-muted)]"
              />
              <button
                type="button"
                onClick={copyPix}
                className="shrink-0 rounded-xl bg-green-grad px-4 py-3 font-display text-sm uppercase tracking-wide text-[#07172e]"
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        <Link
          to="/"
          className="mt-8 flex items-center justify-center gap-2 rounded-full border border-[var(--color-line)] px-7 py-3.5 font-display uppercase tracking-wide text-[var(--color-bone)] transition-colors hover:border-[var(--color-green)] hover:text-[var(--color-green-hi)]"
        >
          Voltar ao site
        </Link>
      </div>
    )
  }

  /* ---------- formulário ---------- */
  const brand = cardBrand(form.cardNumber)
  const processing = status === 'processing'

  return (
    <div className="relative min-h-[100svh]">
      <div className="pointer-events-none absolute inset-0 vignette opacity-70" />

      {/* topo */}
      <header className="relative border-b border-[var(--color-line)] bg-[var(--color-ink)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <button
            onClick={() => navigate('/#ingressos')}
            className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-muted)] transition-colors hover:text-[var(--color-green-hi)]"
          >
            {Ic.back()} Voltar
          </button>
          <img src="/brand/wnbf-logo.png" alt="WNBF Brasil" className="h-11 w-auto sm:h-12" />
          <span className="hidden items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--color-green)] sm:flex">
            {Ic.lock()} Seguro
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-6">
          <p className="eyebrow">Finalizar compra</p>
          <h1 className="mt-2 text-[clamp(1.8rem,5vw,2.75rem)]">Checkout</h1>
        </div>

        {/* resumo no topo (mobile) */}
        <div className="mb-6 lg:hidden">
          <OrderSummary ticket={ticket} fee={fee} total={total} collapsible />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-10">
          {/* ---- FORM ---- */}
          <form id="checkout-form" onSubmit={handleSubmit} noValidate className="min-w-0">
            {/* Seus dados */}
            <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]/40 p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-green-grad font-display text-sm text-[#07172e]">1</span>
                <h2 className="text-xl">Seus dados</h2>
              </div>

              <div className="mt-6 space-y-4">
                <Field id="name" label="Nome completo" error={err('name')}>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Como no documento"
                    value={form.name}
                    onChange={setField('name')}
                    onBlur={blur('name')}
                    aria-invalid={!!err('name')}
                    className={inputCls(!!err('name'))}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="email" label="E-mail" error={err('email')}>
                    <input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="voce@email.com"
                      value={form.email}
                      onChange={setField('email')}
                      onBlur={blur('email')}
                      aria-invalid={!!err('email')}
                      className={inputCls(!!err('email'))}
                    />
                  </Field>
                  <Field id="emailConfirm" label="Confirmar e-mail" error={err('emailConfirm')}>
                    <input
                      id="emailConfirm"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="Repita o e-mail"
                      value={form.emailConfirm}
                      onChange={setField('emailConfirm')}
                      onBlur={blur('emailConfirm')}
                      onPaste={(e) => e.preventDefault()}
                      aria-invalid={!!err('emailConfirm')}
                      className={inputCls(!!err('emailConfirm'))}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="doc" label="CPF ou CNPJ" error={err('doc')}>
                    <input
                      id="doc"
                      type="text"
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={form.doc}
                      onChange={setField('doc')}
                      onBlur={blur('doc')}
                      aria-invalid={!!err('doc')}
                      className={inputCls(!!err('doc'))}
                    />
                  </Field>
                  <Field id="phone" label="Celular" error={err('phone')}>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="(11) 90000-0000"
                      value={form.phone}
                      onChange={setField('phone')}
                      onBlur={blur('phone')}
                      aria-invalid={!!err('phone')}
                      className={inputCls(!!err('phone'))}
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* Endereço */}
            <section className="mt-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]/40 p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-green-grad font-display text-sm text-[#07172e]">2</span>
                <h2 className="text-xl">Endereço</h2>
              </div>

              <div className="mt-6 space-y-4">
                <Field
                  id="cep"
                  label="CEP"
                  error={err('cep')}
                  hint={
                    cepStatus === 'loading'
                      ? 'Buscando endereço…'
                      : cepStatus === 'notfound'
                        ? 'CEP não encontrado — preencha manualmente'
                        : cepStatus === 'error'
                          ? 'Não foi possível buscar o CEP — preencha manualmente'
                          : 'Preenchemos o endereço para você'
                  }
                >
                  <div className="relative sm:max-w-[220px]">
                    <input
                      id="cep"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="00000-000"
                      value={form.cep}
                      onChange={setField('cep')}
                      onBlur={blur('cep')}
                      aria-invalid={!!err('cep')}
                      className={inputCls(!!err('cep'))}
                    />
                    {cepStatus === 'loading' && (
                      <span className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-green)]" />
                    )}
                  </div>
                </Field>

                <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                  <Field id="logradouro" label="Endereço" error={err('logradouro')}>
                    <input
                      id="logradouro"
                      type="text"
                      autoComplete="address-line1"
                      placeholder="Rua, avenida…"
                      value={form.logradouro}
                      onChange={setField('logradouro')}
                      onBlur={blur('logradouro')}
                      aria-invalid={!!err('logradouro')}
                      className={inputCls(!!err('logradouro'))}
                    />
                  </Field>
                  <Field id="number" label="Número" error={err('number')}>
                    <input
                      id="number"
                      type="text"
                      inputMode="numeric"
                      placeholder="Nº"
                      value={form.number}
                      onChange={setField('number')}
                      onBlur={blur('number')}
                      aria-invalid={!!err('number')}
                      className={inputCls(!!err('number'))}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="complemento" label="Complemento" hint="Opcional">
                    <input
                      id="complemento"
                      type="text"
                      autoComplete="address-line2"
                      placeholder="Apto, bloco…"
                      value={form.complemento}
                      onChange={setField('complemento')}
                      className={inputCls(false)}
                    />
                  </Field>
                  <Field id="bairro" label="Bairro" error={err('bairro')}>
                    <input
                      id="bairro"
                      type="text"
                      placeholder="Bairro"
                      value={form.bairro}
                      onChange={setField('bairro')}
                      onBlur={blur('bairro')}
                      aria-invalid={!!err('bairro')}
                      className={inputCls(!!err('bairro'))}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_96px]">
                  <Field id="cidade" label="Cidade" error={err('cidade')}>
                    <input
                      id="cidade"
                      type="text"
                      autoComplete="address-level2"
                      placeholder="Cidade"
                      value={form.cidade}
                      onChange={setField('cidade')}
                      onBlur={blur('cidade')}
                      aria-invalid={!!err('cidade')}
                      className={inputCls(!!err('cidade'))}
                    />
                  </Field>
                  <Field id="uf" label="UF" error={err('uf')}>
                    <input
                      id="uf"
                      type="text"
                      autoComplete="address-level1"
                      placeholder="UF"
                      maxLength={2}
                      value={form.uf}
                      onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2) }))}
                      onBlur={blur('uf')}
                      aria-invalid={!!err('uf')}
                      className={inputCls(!!err('uf'))}
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* Pagamento */}
            <section className="mt-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]/40 p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-green-grad font-display text-sm text-[#07172e]">3</span>
                <h2 className="text-xl">Pagamento</h2>
              </div>

              {/* seletor Pix / Cartão */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { id: 'pix', label: 'Pix', icon: Ic.pix, hint: 'Aprovação na hora' },
                  { id: 'card', label: 'Cartão', icon: Ic.card, hint: 'Até 12x' },
                ].map((m) => {
                  const active = form.method === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, method: m.id }))}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                        active
                          ? 'border-[var(--color-green)] bg-[var(--color-green)]/10'
                          : 'border-[var(--color-line)] hover:border-[var(--color-green-deep)]'
                      }`}
                    >
                      <span className={active ? 'text-[var(--color-green-hi)]' : 'text-[var(--color-muted)]'}>
                        {m.icon()}
                      </span>
                      <span>
                        <span className="block font-display uppercase leading-none">{m.label}</span>
                        <span className="mt-1 block font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                          {m.hint}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Pix */}
              {form.method === 'pix' && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-ink-2)] p-4 text-sm text-[var(--color-muted)]">
                  <span className="mt-0.5 text-[var(--color-green)]">{Ic.pix({ width: 18, height: 18 })}</span>
                  <p>
                    Ao finalizar, geramos o <strong className="text-[var(--color-bone)]">QR Code</strong> e o código
                    copia-e-cola. O pagamento é confirmado em segundos e o ingresso vai direto para o seu e-mail.
                  </p>
                </div>
              )}

              {/* Cartão */}
              {form.method === 'card' && (
                <div className="mt-5 space-y-4">
                  <Field id="cardNumber" label="Número do cartão" error={err('cardNumber')}>
                    <div className="relative">
                      <input
                        id="cardNumber"
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="0000 0000 0000 0000"
                        value={form.cardNumber}
                        onChange={setField('cardNumber')}
                        onBlur={blur('cardNumber')}
                        aria-invalid={!!err('cardNumber')}
                        className={inputCls(!!err('cardNumber'))}
                      />
                      {brand && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--color-green)]">
                          {brand}
                        </span>
                      )}
                    </div>
                  </Field>

                  <Field id="cardName" label="Nome impresso no cartão" error={err('cardName')}>
                    <input
                      id="cardName"
                      type="text"
                      autoComplete="cc-name"
                      placeholder="Igual ao cartão"
                      value={form.cardName}
                      onChange={(e) => setForm((f) => ({ ...f, cardName: e.target.value.toUpperCase() }))}
                      onBlur={blur('cardName')}
                      aria-invalid={!!err('cardName')}
                      className={inputCls(!!err('cardName'))}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field id="cardExpiry" label="Validade" error={err('cardExpiry')}>
                      <input
                        id="cardExpiry"
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/AA"
                        value={form.cardExpiry}
                        onChange={setField('cardExpiry')}
                        onBlur={blur('cardExpiry')}
                        aria-invalid={!!err('cardExpiry')}
                        className={inputCls(!!err('cardExpiry'))}
                      />
                    </Field>
                    <Field id="cardCvv" label="CVV" error={err('cardCvv')}>
                      <input
                        id="cardCvv"
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="000"
                        maxLength={4}
                        value={form.cardCvv}
                        onChange={(e) => setForm((f) => ({ ...f, cardCvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                        onBlur={blur('cardCvv')}
                        aria-invalid={!!err('cardCvv')}
                        className={inputCls(!!err('cardCvv'))}
                      />
                    </Field>
                  </div>

                  <Field id="installments" label="Parcelas">
                    <select
                      id="installments"
                      value={form.installments}
                      onChange={setField('installments')}
                      className={inputCls(false)}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n} className="bg-[var(--color-ink-2)]">
                          {n}x de {brl(total / n)} sem juros
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </section>

            {/* consentimento (LGPD) */}
            <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-[var(--color-muted)]">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
                onBlur={blur('consent')}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-green)]"
              />
              <span>
                Li e concordo com os{' '}
                <span className="text-[var(--color-green-hi)]">Termos</span> e a{' '}
                <span className="text-[var(--color-green-hi)]">Política de Privacidade</span>, e autorizo o uso dos meus
                dados para processar a compra (LGPD).
              </span>
            </label>
            {err('consent') && <p className="mt-1.5 text-xs text-[#ff8f93]">{err('consent')}</p>}

            {apiError && (
              <p className="mt-4 rounded-xl border border-[#e5646a]/40 bg-[#e5646a]/10 px-4 py-3 text-sm text-[#ff8f93]">
                {apiError}
              </p>
            )}

            {/* botão: finalizar pagamento */}
            <button
              type="submit"
              disabled={processing}
              className="group relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-green-grad px-8 py-4 font-display text-lg uppercase tracking-wide text-[#07172e] shadow-green transition-opacity disabled:opacity-70"
            >
              {processing ? (
                'Processando…'
              ) : (
                <>
                  {Ic.lock({ width: 18, height: 18 })}
                  {form.method === 'pix' ? 'Pagar com Pix' : 'Pagar'} · {brl(total)}
                </>
              )}
            </button>

            <p className="mt-4 flex items-center justify-center gap-2 text-center font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">
              {Ic.lock({ width: 13, height: 13 })}
              Pagamento seguro · seus dados são protegidos
            </p>
          </form>

          {/* ---- RESUMO (desktop) ---- */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <OrderSummary ticket={ticket} fee={fee} total={total} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
