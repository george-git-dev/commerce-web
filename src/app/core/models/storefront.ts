/**
 * Conteúdo da vitrine editado no backoffice (sem deploy): banners do
 * carrossel, avisos da faixa do topo e o valor do frete grátis.
 * Contrato do futuro `GET /admin/storefront` (o público, `GET /storefront`,
 * devolve só o que está no ar, já no formato `Banner`).
 */

/** Link interno da loja: caminho + filtros (ex.: `/produtos?oferta=true`). */
export interface StoreLink {
  path: string;
  queryParams?: Record<string, string>;
}

/** Banner como o backoffice enxerga (com nome, ordem, situação e período). */
export interface StoreBanner {
  id: number;
  /** Nome interno, só para a equipe ("Black Friday 2026"). */
  name: string;
  /** Arte do celular, vertical 4:5 (1080 × 1350). Obrigatória. */
  image: string;
  /** Arte larga 8:3 (1920 × 720) para tablet/desktop; sem ela, usa a do celular. */
  imageDesktop?: string;
  /** O que a arte diz/mostra (leitor de tela e Google). */
  alt: string;
  link?: StoreLink;
  active: boolean;
  /** Período opcional (`aaaa-mm-dd`, dias inteiros). Sem data = sem limite. */
  startsOn?: string;
  endsOn?: string;
}

/** Mensagem da faixa rolante do topo. */
export interface Announcement {
  id: number;
  text: string;
  link?: StoreLink;
  active: boolean;
  startsOn?: string;
  endsOn?: string;
}

/** Regras comerciais que a vitrine mostra e o carrinho/checkout usam. */
export interface StoreSettings {
  /** Pedido a partir deste valor (R$) tem o frete econômico grátis. */
  freeShippingMin: number;
  /** Mostra "Frete grátis acima de R$ X" como 1º aviso da faixa. */
  freeShippingNotice: boolean;
}
