import { Product } from '../models/product';

/** Quantos produtos recebem "Lançamento": os últimos cadastrados. */
export const LAUNCH_COUNT = 10;
/** Quantos produtos recebem "Mais vendido": os que mais venderam. */
export const BEST_SELLER_COUNT = 10;

/**
 * Lançamento e Mais vendido são automáticos, nunca marcados no cadastro:
 * - lançamento = os `LAUNCH_COUNT` últimos cadastrados (hoje: maior `id`);
 * - mais vendido = os `BEST_SELLER_COUNT` com mais unidades vendidas (`soldCount` > 0).
 * Fase 2 (B3): o back calcula (`ORDER BY created_at DESC LIMIT 10` e soma dos
 * pedidos pagos) e devolve os mesmos campos — a vitrine não muda.
 */
export function withHighlights(products: readonly Product[]): Product[] {
  const top = (list: readonly Product[], by: (p: Product) => number, count: number) =>
    new Set(
      [...list]
        .sort((a, b) => by(b) - by(a))
        .slice(0, count)
        .map((p) => p.id),
    );
  const launches = top(products, (p) => p.id, LAUNCH_COUNT);
  const sold = products.filter((p) => (p.soldCount ?? 0) > 0);
  const bestSellers = top(sold, (p) => p.soldCount ?? 0, BEST_SELLER_COUNT);
  return products.map((p) => ({
    ...p,
    launch: launches.has(p.id),
    bestSeller: bestSellers.has(p.id),
  }));
}
