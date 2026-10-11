import { Promotion } from '../models/promotion';

/**
 * Promoções FICTÍCIAS: uma no ar (os itens que antes tinham "preço
 * promocional" no produto), uma agendada, uma de liquidação com limite e uma
 * encerrada. Some na Fase 2 (`GET /admin/promotions`).
 */
export const PROMOTIONS_MOCK: readonly Promotion[] = [
  {
    id: 1,
    name: 'Seleção da semana',
    active: true,
    target: {
      kind: 'itens',
      skus: [
        'lattafa-yara-100',
        'afnan-turathi-blue-90',
        'maison-alhambra-delilah-100',
        'al-wataniah-sabah-al-ward-100',
        'swiss-arabian-casablanca-100',
        'lattafa-yara-kit-presente',
        'maison-alhambra-delilah-body-mist-250',
      ],
    },
    discount: { kind: 'percent', value: 14 },
    sold: 0,
  },
  {
    id: 2,
    name: 'Black Friday — perfumes',
    active: true,
    target: { kind: 'categoria', category: 'perfume' },
    discount: { kind: 'percent', value: 20 },
    startsOn: '2026-11-20',
    endsOn: '2026-11-30',
    sold: 0,
  },
  {
    id: 3,
    name: 'Liquidação decants 5 ml',
    active: false,
    target: { kind: 'formato', format: 'decant:5' },
    discount: { kind: 'fixed', value: 19.9 },
    unitLimit: 100,
    sold: 0,
  },
  {
    id: 4,
    name: 'Dia dos Pais — Armaf',
    active: true,
    target: { kind: 'marca', brand: 'Armaf' },
    discount: { kind: 'percent', value: 10 },
    startsOn: '2026-08-01',
    endsOn: '2026-08-09',
    sold: 37,
  },
];
