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

// Lotes de ingresso — 1º lote (preços reais da bilheteria Uticket)
export const TICKETS = [
  {
    slug: 'dia-1',
    tier: '10 Out · Sábado',
    name: 'Ingresso Dia 1',
    price: 'R$ 114',
    priceValue: 114,
    note: '1º lote · + taxa',
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
    price: 'R$ 189',
    priceValue: 189,
    note: '1º lote · + taxa',
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
    price: 'R$ 114',
    priceValue: 114,
    note: '1º lote · + taxa',
    perks: [
      'Acesso ao dia 11/10',
      'Finais & entrega de Pro Cards',
      'Entrada na Expo Natural Fitness',
      'Parcele em até 12x',
    ],
    featured: false,
  },
]

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
  {
    q: 'Por que comprar agora no 1º lote?',
    a: 'O 1º lote tem o menor preço da temporada e quantidade limitada. Conforme as vagas se esgotam, os valores sobem. Garantindo agora, você paga menos e assegura seu lugar.',
  },
  {
    q: 'Como recebo meu ingresso?',
    a: 'A compra é processada com segurança pela Uticket. Após o pagamento, o ingresso digital chega por e-mail e fica disponível na sua conta da plataforma.',
  },
]
