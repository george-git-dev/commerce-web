import { Product, ProductVariant } from '../models/product';
import {
  defaultVariant,
  discountPercent,
  effectivePrice,
  hasDeal,
  hasPriceRange,
  isAvailable,
  lowestPrice,
  variantKinds,
  variantLabel,
} from './product-pricing';

const variant = (overrides: Partial<ProductVariant>): ProductVariant => ({
  id: 'v',
  kind: 'frasco',
  volumeMl: 100,
  price: 100,
  stock: 1,
  ...overrides,
});

const product = (variants: ProductVariant[]): Product => ({
  id: 1,
  slug: 'teste',
  line: 'Teste',
  name: 'Teste',
  description: '',
  brandId: 1,
  brandName: 'Marca',
  category: 'perfume',
  gender: 'Unissex',
  families: [],
  notes: { top: [], heart: [], base: [] },
  status: 'publicado',
  images: [],
  variants,
});

describe('product-pricing', () => {
  it('usa o preço promocional quando existe', () => {
    expect(effectivePrice(variant({ price: 100, promoPrice: 80 }))).toBe(80);
    expect(effectivePrice(variant({ price: 100 }))).toBe(100);
  });

  it('sugere o tamanho mais barato com estoque', () => {
    const cheapOut = variant({ id: 'a', price: 50, stock: 0 });
    const mid = variant({ id: 'b', price: 90 });
    const expensive = variant({ id: 'c', price: 200 });
    expect(defaultVariant(product([expensive, cheapOut, mid]))?.id).toBe('b');
  });

  it('sem estoque em nenhum tamanho, sugere o mais barato mesmo assim', () => {
    const p = product([
      variant({ id: 'a', price: 90, stock: 0 }),
      variant({ id: 'b', price: 50, stock: 0 }),
    ]);
    expect(defaultVariant(p)?.id).toBe('b');
    expect(isAvailable(p)).toBe(false);
  });

  it('filtra por tipo', () => {
    const p = product([
      variant({ id: 'f', kind: 'frasco', price: 400 }),
      variant({ id: 'd', kind: 'decant', volumeMl: 5, price: 40 }),
    ]);
    expect(variantKinds(p)).toEqual(['frasco', 'decant']);
    expect(lowestPrice(p, 'frasco')).toBe(400);
    expect(lowestPrice(p)).toBe(40);
  });

  it('detecta promoção, faixa de preço e desconto', () => {
    const promo = variant({ price: 100, promoPrice: 75 });
    expect(hasDeal(product([promo]))).toBe(true);
    expect(discountPercent(promo)).toBe(25);
    expect(discountPercent(variant({}))).toBeNull();
    expect(hasPriceRange(product([variant({ price: 100 }), variant({ price: 50 })]))).toBe(true);
    expect(hasPriceRange(product([variant({ price: 100 })]))).toBe(false);
  });

  it('monta o rótulo da variante conforme a categoria', () => {
    expect(variantLabel(product([]), variant({ kind: 'decant', volumeMl: 5 }))).toBe('Decant 5 ml');
    expect(variantLabel(product([]), variant({ volumeMl: 100 }))).toBe('Frasco 100 ml');
    expect(variantLabel({ ...product([]), category: 'kit' }, variant({}))).toBe('Kit');
    expect(
      variantLabel({ ...product([]), category: 'hidratante' }, variant({ volumeMl: 200 })),
    ).toBe('Hidratante 200 ml');
    expect(
      variantLabel({ ...product([]), category: 'body-splash' }, variant({ volumeMl: 250 })),
    ).toBe('Body splash 250 ml');
  });
});
