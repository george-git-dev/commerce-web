import { CATALOG_QUERY_PARAMS } from '../config/navigation';
import { STORE_CONFIG } from '../config/store-config';
import { Announcement, StoreBanner, StoreSettings } from '../models/storefront';

/**
 * Conteúdo inicial da vitrine (mock). Some na Fase 2: vem de
 * `GET /storefront` (loja) e `GET /admin/storefront` (backoffice).
 */

export const BANNERS_MOCK: readonly StoreBanner[] = [
  {
    id: 1,
    name: 'Lançamentos da temporada',
    image: 'img/carrossel/lancamentos-mobile.webp',
    imageDesktop: 'img/carrossel/lancamentos-desktop.webp',
    alt: 'Lançamentos da temporada: fragrâncias árabes que acabaram de chegar.',
    link: { path: '/produtos', queryParams: { [CATALOG_QUERY_PARAMS.launch]: 'true' } },
    active: true,
  },
  {
    id: 2,
    name: 'Ofertas até 40%',
    image: 'img/carrossel/ofertas-mobile.webp',
    imageDesktop: 'img/carrossel/ofertas-desktop.webp',
    alt: 'Ofertas: até 40% off em perfumes selecionados, por tempo limitado.',
    link: { path: '/produtos', queryParams: { [CATALOG_QUERY_PARAMS.deal]: 'true' } },
    active: true,
  },
];

export const ANNOUNCEMENTS_MOCK: readonly Announcement[] = [
  { id: 1, text: `Parcele em até ${STORE_CONFIG.maxInstallments}x sem juros`, active: true },
  { id: 2, text: 'Compra segura', active: true },
];

export const STORE_SETTINGS_MOCK: StoreSettings = {
  freeShippingMin: STORE_CONFIG.freeShippingMin,
  freeShippingNotice: true,
};
