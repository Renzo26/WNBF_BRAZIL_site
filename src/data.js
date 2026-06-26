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
  venue: 'São Paulo · Barra Funda', // [CONFIRMAR local/endereço exato]
}

export const TICKET_URL =
  'https://uticket.com.br/evento/natural-fitness-health-brasil/01M14WH00AYGIB'

export const WHATSAPP_URL = 'https://wnbfbrazil.com.br/' // [TROCAR pelo WhatsApp de expositores]

// Lotes de ingresso — [CONFIRMAR preços reais do 1º lote]
export const TICKETS = [
  {
    tier: 'Lote 01',
    name: 'Plateia',
    price: 'R$ 89',
    note: 'Preço de abertura',
    perks: ['Acesso aos dois dias', 'Arquibancada geral', 'Entrada na Expo Natural Fitness'],
    featured: false,
  },
  {
    tier: 'Lote 01',
    name: 'Premium',
    price: 'R$ 189',
    note: 'O mais procurado',
    perks: [
      'Acesso aos dois dias',
      'Cadeira numerada perto do palco',
      'Expo + área de ativações',
      'Brinde oficial do evento',
    ],
    featured: true,
  },
  {
    tier: 'Lote 01',
    name: 'Front Row VIP',
    price: 'R$ 349',
    note: 'Vagas muito limitadas',
    perks: [
      'Primeira fileira, a metros do palco',
      'Credencial VIP + acesso prioritário',
      'Kit exclusivo do atleta',
      'Meet & greet com atletas Pro',
    ],
    featured: false,
  },
]

export const CATEGORIES = [
  { name: 'Bodybuilding', kicker: 'Massa & densidade', n: '01', image: '/atletas/body.jpg', photoPosition: 'center top' },
  { name: "Men's Physique", kicker: 'Estética & proporção', n: '02', image: '/atletas/MensV2.jpg', photoPosition: 'center top' },
  { name: 'Classic Physique', kicker: 'A era de ouro', n: '03', image: '/atletas/Classic.jpg', photoPosition: 'center 20%' },
  { name: 'Bikini', kicker: 'Tônus & elegância', n: '04', image: '/atletas/Bikini.jpg', photoPosition: 'center 20%' },
  { name: 'Figure', kicker: 'Linhas & simetria', n: '05', image: '/atletas/Figure.jpg', photoPosition: 'center 20%' },
  { name: 'Wellness', kicker: 'Curvas & equilíbrio', n: '06', image: '/atletas/Welness.jpg', photoPosition: 'center top' },
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
