import { Product } from '../models/product';
import { BEST_SELLER_COUNT, LAUNCH_COUNT, withHighlights } from './product-highlights';

const product = (id: number, soldCount?: number) => ({ id, soldCount }) as Product;

describe('withHighlights', () => {
  const list = Array.from({ length: 15 }, (_, i) => product(i + 1, i === 0 ? 0 : 15 - i));
  const result = withHighlights(list);

  it('lançamento = os últimos cadastrados', () => {
    const launches = result.filter((p) => p.launch).map((p) => p.id);
    expect(launches).toHaveLength(LAUNCH_COUNT);
    expect(Math.min(...launches)).toBe(15 - LAUNCH_COUNT + 1);
  });

  it('mais vendido = os que mais venderam, nunca quem não vendeu', () => {
    const best = result.filter((p) => p.bestSeller).map((p) => p.id);
    expect(best).toHaveLength(BEST_SELLER_COUNT);
    expect(best).toContain(2);
    expect(best).not.toContain(1);
    expect(withHighlights([product(1), product(2, 0)]).some((p) => p.bestSeller)).toBe(false);
  });
});
