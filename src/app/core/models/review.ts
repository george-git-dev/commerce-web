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
}

/** Resumo exibido no topo da seção: média, total e quantas de cada nota. */
export interface ReviewSummary {
  average: number;
  count: number;
  /** Índice 0 = 1 estrela … índice 4 = 5 estrelas. */
  distribution: readonly number[];
}

/** Uma página de avaliações — formato de `GET /products/{slug}/reviews?page=`. */
export interface ReviewPage {
  summary: ReviewSummary;
  items: readonly ProductReview[];
  hasMore: boolean;
}
