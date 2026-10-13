import { ReviewRecord } from '../models/review';

/**
 * Avaliações FICTÍCIAS aguardando moderação (para a tela de Aprovações). Uma
 * delas tem link e telefone, para ver o destaque de spam. Some na Fase 2.
 */
export const PENDING_REVIEWS_MOCK: readonly Omit<ReviewRecord, 'status'>[] = [
  {
    id: 9001,
    productId: 103,
    slug: 'lattafa-khamrah',
    productName: 'Khamrah',
    variantLabel: 'Frasco 100 ml',
    orderNumber: 'NP101180',
    authorName: 'Patrícia L.',
    rating: 5,
    comment:
      'Chegou rápido e muito bem embalado. Canela e tâmara na medida, perfeito para o inverno.',
    createdAt: '2026-10-08',
  },
  {
    id: 9002,
    productId: 108,
    slug: 'afnan-9pm',
    productName: '9PM',
    variantLabel: 'Decant 10 ml',
    orderNumber: 'NP101174',
    authorName: 'Gabriel M.',
    rating: 4,
    comment: 'Gostei, mas achei a fixação média. A projeção é ótima nas primeiras horas.',
    createdAt: '2026-10-07',
  },
  {
    id: 9003,
    productId: 102,
    slug: 'lattafa-yara',
    productName: 'Yara',
    variantLabel: 'Frasco 100 ml',
    authorName: 'Loja P.',
    rating: 1,
    comment: 'Compra mais barato no meu site www.perfumesbaratos.com ou chama no (11) 98888-7777',
    createdAt: '2026-10-06',
  },
  {
    id: 9004,
    productId: 111,
    slug: 'rasasi-hawas-for-him',
    productName: 'Hawas for Him',
    variantLabel: 'Decant 5 ml',
    orderNumber: 'NP101160',
    authorName: 'Felipe C.',
    rating: 5,
    comment: 'Melhor custo-benefício que já comprei. Recebo elogio todo dia no trabalho.',
    createdAt: '2026-10-05',
  },
  {
    id: 9005,
    productId: 106,
    slug: 'armaf-club-de-nuit-intense-man',
    productName: 'Club de Nuit Intense Man',
    variantLabel: 'Frasco 105 ml',
    orderNumber: 'NP101152',
    authorName: 'Renata A.',
    rating: 3,
    comment: 'O perfume é bom, mas a caixa veio amassada. O frasco estava inteiro.',
    createdAt: '2026-10-03',
  },
];
