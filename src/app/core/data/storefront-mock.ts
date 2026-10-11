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
  // Exemplo de recado/promoção. "Parcele" e "Compra segura" saíram: são fixos da
  // loja (o parcelamento vem da configuração de pagamento), não avisos.
  {
    id: 1,
    text: 'Cupom NANI10: 10% de desconto em todo o site',
    link: { path: '/produtos' },
    active: true,
  },
];

export const STORE_SETTINGS_MOCK: StoreSettings = {
  freeShipping: { active: true, min: STORE_CONFIG.freeShippingMin, notice: true },
};
