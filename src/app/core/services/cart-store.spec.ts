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

  it('soma quantidades da mesma variante sem passar do estoque; esgotado não entra', () => {
    const cart = TestBed.inject(CartStore);
    const asad = product('lattafa-asad');
    const variant = asad.variants[0];
    cart.add(asad, variant, 1);
    cart.add(asad, variant, 1000);
    expect(cart.items()[0].quantity).toBe(variant.stock);
    cart.add(asad, { ...variant, id: 'sem-estoque', stock: 0 });
    expect(cart.items()).toHaveLength(1);
  });

  it('muda quantidade (com teto), remove com zero, remove e esvazia', () => {
    const cart = TestBed.inject(CartStore);
    const asad = product('lattafa-asad');
    const khamrah = product('lattafa-khamrah');
    cart.add(asad, asad.variants[0]);
    cart.add(khamrah, khamrah.variants[0]);
    cart.setQuantity(asad.variants[0].id, 999);
    expect(cart.items()[0].quantity).toBe(asad.variants[0].stock);
    cart.setQuantity(asad.variants[0].id, 0);
    expect(cart.items().map((l) => l.product.slug)).toEqual(['lattafa-khamrah']);
    cart.remove(khamrah.variants[0].id);
    expect(cart.count()).toBe(0);
    cart.add(asad, asad.variants[0]);
    cart.clear();
    expect(cart.items()).toEqual([]);
  });

  it('outra aba mexeu na sacola: esta atualiza', () => {
    const cart = TestBed.inject(CartStore);
    const asad = product('lattafa-asad');
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ slug: 'lattafa-asad', variantId: asad.variants[0].id, quantity: 1 }]),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: CART_STORAGE_KEY }));
    expect(cart.count()).toBe(1);
    window.dispatchEvent(new StorageEvent('storage', { key: 'outra-chave' }));
    expect(cart.count()).toBe(1);
  });
});
