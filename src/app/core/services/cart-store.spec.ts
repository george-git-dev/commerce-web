import { TestBed } from '@angular/core/testing';
import { CART_STORAGE_KEY, CartStore } from './cart-store';
import { CatalogService } from './catalog-service';

describe('CartStore (sacola salva no navegador)', () => {
  beforeEach(() => localStorage.clear());

  const product = (slug: string) => TestBed.inject(CatalogService).findBySlug(slug)!;

  it('salva só slug, variante e quantidade — sem preço', () => {
    const cart = TestBed.inject(CartStore);
    const asad = product('lattafa-asad');
    cart.add(asad, asad.variants[0], 2);
    TestBed.tick();

    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!);
    expect(stored).toEqual([{ slug: 'lattafa-asad', variantId: asad.variants[0].id, quantity: 2 }]);
    expect(localStorage.getItem(CART_STORAGE_KEY)).not.toContain('price');
  });

  it('remonta a sacola pelo catálogo, descartando o que não existe e respeitando o estoque', () => {
    const asad = product('lattafa-asad');
    const nineToPm = product('afnan-9pm'); // estoque 2
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { slug: 'lattafa-asad', variantId: asad.variants[0].id, quantity: 1 },
        { slug: 'afnan-9pm', variantId: nineToPm.variants[0].id, quantity: 10 },
        { slug: 'nao-existe', variantId: 'x', quantity: 1 },
      ]),
    );

    const cart = TestBed.inject(CartStore);
    expect(cart.items().map((line) => [line.product.slug, line.quantity])).toEqual([
      ['lattafa-asad', 1],
      ['afnan-9pm', nineToPm.variants[0].stock],
    ]);
  });

  it('ignora dado corrompido', () => {
    localStorage.setItem(CART_STORAGE_KEY, '{quebrado');
    expect(TestBed.inject(CartStore).items()).toEqual([]);
  });
});
