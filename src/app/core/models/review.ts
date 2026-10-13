/**
 * Avaliação publicada de um produto. Regras (aplicadas pelo back):
 * - só avalia quem tem pedido **entregue** com o produto (compra verificada);
 * - uma avaliação por item comprado;
 * - entra como pendente e só aparece na loja depois de aprovada no backoffice.
 * Por isso a loja só recebe avaliações aprovadas e o modelo não traz a situação.
 */
export interface ProductReview {
  id: number;
  productId: number;
  /** Primeiro nome + inicial do sobrenome ("Maria S."), por LGPD. */
  authorName: string;
  /** 1 a 5. */
  rating: number;
  comment: string;
  /** Data ISO (yyyy-MM-dd). */
  createdAt: string;
  /** Resposta da loja (aparece embaixo, assinada pela loja, nunca por pessoa). */
  reply?: StoreReply;
}

export interface StoreReply {
  text: string;
  /** Data ISO (yyyy-MM-dd). */
  createdAt: string;
}

/** Situação na moderação (o cliente vê "Em análise", "Publicada" ou "Não publicada"). */
export type ReviewStatus = 'pendente' | 'aprovada' | 'reprovada';

/**
 * Avaliação completa, como o BACK guarda (o backoffice vê tudo; a loja só
 * recebe `ProductReview` das aprovadas). Fase 2: tabela `review`.
 */
export interface ReviewRecord extends ProductReview {
  slug: string;
  productName: string;
  /** "Frasco 100 ml", "Decant 5 ml"… (vazio nas avaliações antigas do mock). */
  variantLabel: string;
  orderNumber?: string;
  itemId?: string;
  status: ReviewStatus;
  /** Quem aprovou/reprovou e quando; motivo só na reprovação (só a equipe vê). */
  moderation?: { by: string; at: Date; reason?: string };
  /** Quem da equipe respondeu (interno; na loja aparece só "Nani Perfumes"). */
  replyBy?: string;
}

/** Resumo exibido no topo da seção: média, total e quantas de cada nota. */
export interface ReviewSummary {
  average: number;
  count: number;
  /** Índice 0 = 1 estrela … índice 4 = 5 estrelas. */
  distribution: readonly number[];
}

/** Ordem da lista na página do produto (`?sort=` no back). */
export type ReviewSort = 'recentes' | 'antigas' | 'maior-nota' | 'menor-nota';

export const REVIEW_SORT_LABELS: Record<ReviewSort, string> = {
  recentes: 'Mais recentes',
  antigas: 'Mais antigas',
  'maior-nota': 'Maior nota',
  'menor-nota': 'Menor nota',
};

/** Uma página de avaliações — formato de `GET /products/{slug}/reviews?page=`. */
export interface ReviewPage {
  summary: ReviewSummary;
  items: readonly ProductReview[];
  hasMore: boolean;
}
