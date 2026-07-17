// ============================================================
// DADOS DO EVENTO — edite aqui para atualizar a página inteira
// ============================================================

export const EVENT = {
  name: 'Natural Fitness & Health Brasil',
  edition: '2026',
  championship: 'WNBF Brazilian Championships',
  dateLabel: '10 & 11 OUT',
  dateFull: '10 e 11 de Outubro de 2026',
  dateISO: '2026-10-10T09:00:00-03:00',
  city: 'São Paulo · Barra Funda',
  venue: 'Expo Barra Funda · São Paulo',
}

export const TICKET_URL =
  'https://uticket.com.br/evento/natural-fitness-health-brasil/01M14WH00AYGIB'

export const WHATSAPP_URL = 'https://wnbfbrazil.com.br/' // [TROCAR pelo WhatsApp de expositores]

// ============================================================
// LOCALIZAÇÃO — edite só aqui para atualizar o mapa e os botões
// ============================================================
export const LOCATION = {
  // Nome do local exibido no card do mapa
  name: 'Expo Barra Funda',
  // Endereço formatado (linha 1 / linha 2) exibido no card
  line1: 'R. Tagipuru, 1001',
  line2: 'Barra Funda, São Paulo - SP',
  cep: '05001-000',
  // Consulta usada em todos os deep links de navegação e no mapa embutido
  query: 'Expo Barra Funda, R. Tagipuru, 1001, Barra Funda, São Paulo - SP, 05001-000',
  // Coordenadas aproximadas (opcional) — deixe vazio para usar só o endereço
  lat: '',
  lng: '',
}

/** Monta os links de navegação (Waze, Google, Apple) a partir de LOCATION. */
export const getMapLinks = () => {
  const q = encodeURIComponent(LOCATION.query)
  const ll = LOCATION.lat && LOCATION.lng ? `${LOCATION.lat},${LOCATION.lng}` : ''
  return {
    embed: `https://www.google.com/maps?q=${q}&output=embed`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    waze: ll ? `https://waze.com/ul?ll=${ll}&navigate=yes` : `https://waze.com/ul?q=${q}&navigate=yes`,
    apple: `https://maps.apple.com/?daddr=${q}`,
  }
}

// Taxa de serviço aplicada sobre o valor do ingresso (bilheteria).
export const FEE_RATE = 0.1

// ============================================================
// SISTEMA DE LOTES — vire a chave da campanha em um lugar só
// ------------------------------------------------------------
// • LOTE_ATIVO define qual lote a landing e o checkout exibem.
// • O 1º lote continua intacto e reversível: basta voltar para 1.
// • Preview sem editar código: acesse com ?lote=1 ou ?lote=2 na URL.
//
// ⚠️ O PREÇO COBRADO vem do BACKEND (tabela ticket_types), não daqui.
//    Virar o lote de verdade = trocar LOTE_ATIVO para 2 AQUI
//    + rodar backend/scripts/virar_lote_2.sql no banco.
//    Veja VIRADA_LOTE_2.md na raiz.
// ============================================================
export const LOTE_ATIVO = 2

export const LOTES = {
  1: {
    n: 1,
    label: '1º Lote',
    badge: null, // sem selo de urgência no 1º lote
    eyebrow: 'Ingressos · 1º Lote',
    headline: 'O menor preço é agora',
    sub: 'O 1º lote tem quantidade limitada e o valor sobe conforme as vagas se esgotam. Garanta seu lugar antes da virada de lote.',
    urgency: null,
    heroCta: 'Garantir ingresso — 1º lote',
    finalCta: 'O 1º lote não espera. Garanta o menor preço e esteja onde o físico de verdade é celebrado.',
    sticky: { kicker: '1º Lote · vagas limitadas', title: 'Garanta o menor preço' },
    faqPreco: {
      q: 'Por que comprar agora no 1º lote?',
      a: 'O 1º lote tem o menor preço da temporada e quantidade limitada. Conforme as vagas se esgotam, os valores sobem. Garantindo agora, você paga menos e assegura seu lugar.',
    },
    prices: { 'dia-1': 114, 'passaporte-2-dias': 189, 'dia-2': 114 },
    previous: null,
    marquee: null, // usa o marquee padrão
    timeline: null, // sem seção de linha de lotes
  },
  2: {
    n: 2,
    label: '2º Lote',
    badge: '2º Lote', // selo de urgência (âmbar) exibido na landing
    eyebrow: 'Ingressos · 2º Lote',
    headline: 'O 2º lote está no ar',
    sub: 'O 1º lote esgotou. O 2º lote também é limitado e sobe até a virada final — garanta o seu antes do próximo reajuste.',
    urgency: '1º lote esgotado · 2º lote com vagas limitadas',
    heroCta: 'Garantir ingresso — 2º lote',
    finalCta: 'O 2º lote não espera. A cada virada o valor sobe — garanta agora o melhor preço ainda disponível.',
    sticky: { kicker: '2º Lote · últimas vagas', title: 'Garanta antes de subir' },
    faqPreco: {
      q: 'Por que comprar agora no 2º lote?',
      a: 'O 1º lote já esgotou. O 2º lote é o menor preço ainda disponível e também é limitado — a cada virada de lote o valor sobe. Comprando agora você garante o melhor preço restante.',
    },
    prices: { 'dia-1': 135, 'passaporte-2-dias': 252, 'dia-2': 135 },
    previous: { 'dia-1': 114, 'passaporte-2-dias': 189, 'dia-2': 114 }, // preço riscado ("de → por")
    // Marquee com tom de urgência (só no 2º lote)
    marquee: ['1º LOTE ESGOTADO', '2º LOTE NO AR', 'VAGAS LIMITADAS', 'O PREÇO SOBE ATÉ A VIRADA FINAL', 'GARANTA JÁ', '10·11 OUT 2026'],
    // Linha de lotes — seção nova exibida só no 2º lote
    timeline: {
      eyebrow: 'A virada dos lotes',
      headline: 'O preço só sobe daqui pra frente',
      sub: 'Cada lote tem vagas limitadas. Quando esgota, o valor sobe — e não volta. Você está no melhor preço ainda disponível.',
      steps: [
        { label: '1º Lote', state: 'done', tag: 'Encerrado', desc: 'Esgotado', price: 'R$ 114 / R$ 189' },
        { label: '2º Lote', state: 'current', tag: 'Você está aqui', desc: 'Disponível agora', price: 'R$ 135 / R$ 252' },
        { label: 'Lote Final', state: 'next', tag: 'Em breve', desc: 'Maior preço', price: 'Aguarde' },
      ],
    },
  },
}

/** Resolve o lote ativo: ?lote=1|2 na URL tem prioridade (preview), senão LOTE_ATIVO. */
function resolveLote() {
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get('lote')
    if (q === '1' || q === '2') return Number(q)
  }
  return LOTE_ATIVO
}

/** Configuração do lote atualmente exibido (copy, preços, selo). */
export const LOTE = LOTES[resolveLote()] ?? LOTES[1]

// Estrutura fixa dos ingressos (não muda entre lotes: nomes, perks, destaque).
const TICKET_BASE = [
  {
    slug: 'dia-1',
    tier: '10 Out · Sábado',
    name: 'Ingresso Dia 1',
    perks: [
      'Acesso ao dia 10/10',
      'Eliminatórias por categoria',
      'Entrada na Expo Natural Fitness',
      'Parcele em até 12x',
    ],
    featured: false,
  },
  {
    slug: 'passaporte-2-dias',
    tier: '10 + 11 Out · Os 2 dias',
    name: 'Passaporte 2 Dias',
    perks: [
      'Acesso aos dois dias — 10 e 11/10',
      'Eliminatórias, finais e entrega de Pro Cards',
      'Expo Natural Fitness completa',
      'Melhor custo-benefício',
      'Parcele em até 12x',
    ],
    featured: true,
  },
  {
    slug: 'dia-2',
    tier: '11 Out · Domingo',
    name: 'Ingresso Dia 2',
    perks: [
      'Acesso ao dia 11/10',
      'Finais & entrega de Pro Cards',
      'Entrada na Expo Natural Fitness',
      'Parcele em até 12x',
    ],
    featured: false,
  },
]

// Ingressos do lote ativo — preços e "preço anterior" (riscado) vêm de LOTE.
export const TICKETS = TICKET_BASE.map((t) => {
  const priceValue = LOTE.prices[t.slug]
  const prevValue = LOTE.previous?.[t.slug] ?? null
  return {
    ...t,
    priceValue,
    price: `R$ ${priceValue}`,
    prevPrice: prevValue ? `R$ ${prevValue}` : null,
    note: `${LOTE.label} · + taxa`,
  }
})

/** Busca um ingresso pelo slug da URL (/checkout/:slug). */
export const getTicketBySlug = (slug) => TICKETS.find((t) => t.slug === slug)

export const CATEGORIES = [
  { name: 'Bodybuilding', kicker: 'Massa & densidade', n: '01', image: '/atletas/body.webp', photoPosition: 'center top' },
  { name: "Men's Physique", kicker: 'Estética & proporção', n: '02', image: '/atletas/MensV2.webp', photoPosition: 'center top' },
  { name: 'Classic Physique', kicker: 'A era de ouro', n: '03', image: '/atletas/Classic.webp', photoPosition: 'center 20%' },
  { name: 'Bikini', kicker: 'Tônus & elegância', n: '04', image: '/atletas/Bikini.webp', photoPosition: 'center 20%' },
  { name: 'Figure', kicker: 'Linhas & simetria', n: '05', image: '/atletas/Figure.webp', photoPosition: 'center 20%' },
  { name: 'Wellness', kicker: 'Curvas & equilíbrio', n: '06', image: '/atletas/Welness.webp', photoPosition: 'center top' },
]

export const FAQ = [
  {
    q: 'O que é o Natural Fitness & Health Brasil?',
    a: 'É a feira e o campeonato que reúnem, em dois dias, o WNBF Brazilian Championships — etapa nacional da federação de fisiculturismo natural mais antiga e respeitada do mundo — somados a uma Expo com ativações de marcas, experiências e o que há de mais novo no universo fitness e saúde.',
  },
  {
    q: 'O que significa ser um evento 100% natural?',
    a: 'Significa que todos os atletas são testados — sem exceção. A WNBF aplica polígrafo obrigatório e teste de urina enviado a laboratórios credenciados pela WADA. Para competir, o atleta precisa estar livre de anabolizantes e diuréticos farmacêuticos há, no mínimo, 10 anos.',
  },
  {
    q: 'Preciso ser atleta para ir?',
    a: 'Não. O evento é aberto ao público — para atletas, treinadores, profissionais de saúde, entusiastas e qualquer pessoa que admire o físico construído de forma natural. Você assiste às competições e aproveita toda a Expo.',
  },
  {
    q: 'O ingresso vale para os dois dias?',
    a: 'Sim. Todos os ingressos dão acesso aos dois dias (10 e 11 de outubro), incluindo competições e a área da Expo.',
  },
  // Pergunta de preço muda conforme o lote ativo (ver LOTE.faqPreco).
  LOTE.faqPreco,
  {
    q: 'Como recebo meu ingresso?',
    a: 'A compra é processada com segurança no nosso próprio checkout (Pix ou cartão). Após a confirmação do pagamento, o ingresso digital com QR Code é enviado por e-mail e WhatsApp.',
  },
]
