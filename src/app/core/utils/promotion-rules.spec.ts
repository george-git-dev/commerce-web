import { Product } from '../models/product';
import { Promotion } from '../models/promotion';
import {
  applyPromotions,
  bestPromo,
  discountedPrice,
  promoStatus,
  promotionProblems,
  targetMatches,
} from './promotion-rules';

const product = {
  id: 1,
  slug: 'asad',
  name: 'Asad',
  brandName: 'Lattafa',
  category: 'perfume',
  variants: [
    { id: 'asad-100', kind: 'frasco', volumeMl: 100, price: 300, stock: 5 },
    { id: 'asad-d5', kind: 'decant', volumeMl: 5, price: 40, stock: 5 },
  ],
} as unknown as Product;

const promo = (over: Partial<Promotion>): Promotion => ({
  id: 1,
  name: 'Teste',
  active: true,
  target: { kind: 'marca', brand: 'Lattafa' },
  discount: { kind: 'percent', value: 10 },
  sold: 0,
  ...over,
});
const today = '2026-10-10';

describe('promoções', () => {
  it('situação: agendada, no ar, encerrada, inativa e limite', () => {
    expect(promoStatus(promo({}), today)).toBe('no-ar');
    expect(promoStatus(promo({ startsOn: '2026-11-20' }), today)).toBe('agendada');
    expect(promoStatus(promo({ endsOn: '2026-10-09' }), today)).toBe('encerrada');
    expect(promoStatus(promo({ active: false }), today)).toBe('inativa');
    expect(promoStatus(promo({ unitLimit: 10, sold: 10 }), today)).toBe('esgotada');
  });

  it('alvo: itens, categoria, marca e formato', () => {
    const [bottle, decant] = product.variants;
    expect(targetMatches({ kind: 'itens', skus: ['asad-d5'] }, product, decant)).toBe(true);
    expect(targetMatches({ kind: 'itens', skus: ['asad-d5'] }, product, bottle)).toBe(false);
    expect(targetMatches({ kind: 'categoria', category: 'kit' }, product, bottle)).toBe(false);
    expect(targetMatches({ kind: 'formato', format: 'decant' }, product, decant)).toBe(true);
    expect(targetMatches({ kind: 'formato', format: 'decant:5' }, product, decant)).toBe(true);
    expect(targetMatches({ kind: 'formato', format: 'decant:10' }, product, decant)).toBe(false);
    expect(targetMatches({ kind: 'formato', format: 'frasco' }, product, bottle)).toBe(true);
  });

  it('desconto: %, R$ e preço fixo; não aplica se não fica mais barato', () => {
    expect(discountedPrice(300, { kind: 'percent', value: 10 })).toBe(270);
    expect(discountedPrice(300, { kind: 'amount', value: 20 })).toBe(280);
    expect(discountedPrice(40, { kind: 'fixed', value: 5.99 })).toBe(5.99);
    expect(discountedPrice(40, { kind: 'fixed', value: 50 })).toBeNull();
    expect(discountedPrice(10, { kind: 'amount', value: 20 })).toBeNull();
  });

  it('não acumula: vale o maior desconto; só as no ar', () => {
    const promos = [
      promo({ id: 1, discount: { kind: 'percent', value: 10 } }),
      promo({
        id: 2,
        target: { kind: 'formato', format: 'decant:5' },
        discount: { kind: 'fixed', value: 19.9 },
      }),
      promo({ id: 3, discount: { kind: 'percent', value: 50 }, startsOn: '2026-12-01' }),
    ];
    const [bottle, decant] = product.variants;
    expect(bestPromo(product, bottle, promos, today)?.price).toBe(270);
    expect(bestPromo(product, decant, promos, today)?.promo.id).toBe(2);
    const applied = applyPromotions(product, promos, today);
    expect(applied.variants.map((v) => v.promoPrice)).toEqual([270, 19.9]);
    expect(applyPromotions(product, [], today).variants[0].promoPrice).toBeUndefined();
  });

  it('validação', () => {
    const ok = {
      name: 'Liquidação',
      active: true,
      target: { kind: 'formato', format: 'decant:5' } as const,
      discount: { kind: 'fixed', value: 5.99 } as const,
    };
    expect(promotionProblems(ok)).toEqual([]);
    expect(promotionProblems({ ...ok, name: 'a' })).toHaveLength(1);
    expect(promotionProblems({ ...ok, target: { kind: 'itens', skus: [] } })).toHaveLength(1);
    expect(promotionProblems({ ...ok, discount: { kind: 'percent', value: 95 } })).toHaveLength(1);
    expect(promotionProblems({ ...ok, startsOn: '2026-11-30', endsOn: '2026-11-01' })).toHaveLength(
      1,
    );
    expect(promotionProblems({ ...ok, unitLimit: 0 })).toHaveLength(1);
  });

  it('até acabar o estoque: esgota quando as vendidas chegam ao estoque do início', () => {
    const promo = {
      id: 9,
      name: 'Até zerar',
      active: true,
      target: { kind: 'marca', brand: 'Armaf' },
      discount: { kind: 'percent', value: 10 },
      untilSoldOut: true,
      unitLimit: 20,
      endsOn: '2026-12-31',
      sold: 19,
    } as const;
    expect(promoStatus({ ...promo }, '2026-10-10')).toBe('no-ar');
    expect(promoStatus({ ...promo, sold: 20 }, '2026-10-10')).toBe('esgotada');
    // A data vence antes do estoque: encerrada.
    expect(promoStatus({ ...promo }, '2027-01-01')).toBe('encerrada');
  });
});

describe('promoções — rótulos e validação', () => {
  it('formato, alvo e desconto em texto', async () => {
    const r = await import('./promotion-rules');
    expect(r.formatLabel('frasco')).toBe('Frasco');
    expect(r.formatLabel('decant')).toBe('Decants (todos os tamanhos)');
    expect(r.formatLabel('decant:5')).toBe('Decant 5 ml');
    expect(r.targetLabel({ kind: 'itens', skus: ['a'] })).toBe('1 item escolhido');
    expect(r.targetLabel({ kind: 'itens', skus: ['a', 'b'] })).toBe('2 itens escolhidos');
    expect(r.targetLabel({ kind: 'categoria', category: 'perfume' })).toMatch(/^Categoria: /);
    expect(r.targetLabel({ kind: 'marca', brand: 'Lattafa' })).toBe('Marca: Lattafa');
    expect(r.targetLabel({ kind: 'formato', format: 'decant:5' })).toBe('Formato: Decant 5 ml');
    expect(r.discountLabel({ kind: 'percent', value: 15 })).toBe('-15%');
    expect(r.discountLabel({ kind: 'amount', value: 20 })).toMatch(/R\$\s20,00 a menos/);
    expect(r.discountLabel({ kind: 'fixed', value: 5.99 })).toMatch(/Por R\$\s5,99/);
  });

  it('alvo por formato: decant (todos) e tamanho específico', () => {
    const decant = product.variants[1];
    const frasco = product.variants[0];
    expect(targetMatches({ kind: 'formato', format: 'decant' }, product, decant)).toBe(true);
    expect(targetMatches({ kind: 'formato', format: 'decant:5' }, product, decant)).toBe(true);
    expect(targetMatches({ kind: 'formato', format: 'frasco' }, product, frasco)).toBe(true);
    expect(targetMatches({ kind: 'categoria', category: 'kit' }, product, frasco)).toBe(false);
    expect(targetMatches({ kind: 'itens', skus: ['asad-d5'] }, product, decant)).toBe(true);
  });

  it('cada problema do cadastro', () => {
    const base = { ...promo({}), name: 'Black' } as Omit<Promotion, 'id' | 'sold'>;
    expect(promotionProblems(base)).toEqual([]);
    expect(promotionProblems({ ...base, name: 'x'.repeat(61) })).toHaveLength(1);
    expect(promotionProblems({ ...base, target: { kind: 'itens', skus: [] } })).toHaveLength(1);
    expect(
      promotionProblems({ ...base, target: { kind: 'categoria', category: '' } }),
    ).toHaveLength(1);
    expect(promotionProblems({ ...base, target: { kind: 'marca', brand: '' } })).toHaveLength(1);
    expect(promotionProblems({ ...base, target: { kind: 'formato', format: '' } })).toHaveLength(1);
    expect(promotionProblems({ ...base, discount: { kind: 'amount', value: 0 } })).toEqual([
      'Informe o desconto.',
    ]);
    expect(promotionProblems({ ...base, discount: { kind: 'percent', value: 95 } })).toHaveLength(
      1,
    );
    expect(
      promotionProblems({ ...base, startsOn: '2026-10-10', endsOn: '2026-10-01' }),
    ).toHaveLength(1);
    expect(promotionProblems({ ...base, unitLimit: 0 })).toHaveLength(1);
  });
});
