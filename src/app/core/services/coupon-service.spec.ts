import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth-service';
import { CartStore } from './cart-store';
import { CatalogService } from './catalog-service';
import { CouponService } from './coupon-service';

describe('CouponService', () => {
  let service: CouponService;
  let cart: CartStore;
  const add = (slug: string, quantity = 1) => {
    const product = TestBed.inject(CatalogService)
      .products()
      .find((p) => p.slug === slug)!;
    cart.add(product, product.variants[0], quantity);
  };

  beforeEach(() => {
    localStorage.clear();
    service = TestBed.inject(CouponService);
    cart = TestBed.inject(CartStore);
    service.today.set('2026-10-10');
  });

  it('aplica cupom de porcentagem, sem diferenciar maiúsculas', () => {
    add('lattafa-asad');
    const subtotal = cart.subtotal();
    expect(service.apply(' nani10 ').ok).toBe(true);
    expect(service.productDiscount(service.applied())).toBe(Math.round(subtotal * 10) / 100);
  });

  it('respeita o pedido mínimo e para de valer se o carrinho diminuir', () => {
    const asad = TestBed.inject(CatalogService)
      .products()
      .find((p) => p.slug === 'lattafa-asad')!;
    cart.add(
      asad,
      asad.variants.find((v) => v.id === 'lattafa-asad-d5')!,
    );
    expect(service.apply('BEMVINDO30').ok).toBe(false);
    cart.add(asad, asad.variants[0]);
    expect(service.apply('BEMVINDO30').ok).toBe(true);
    expect(service.productDiscount(service.applied())).toBe(30);
    cart.remove('lattafa-asad-100');
    expect(service.productDiscount(service.applied())).toBe(0);
  });

  it('cupom sem oferta não desconta de item já em promoção', () => {
    add('lattafa-yara'); // na "Seleção da semana"
    expect(service.apply('NANI10')).toEqual({
      ok: false,
      message: 'Este cupom não vale para itens que já estão em oferta.',
    });
    add('lattafa-asad');
    expect(service.apply('NANI10').ok).toBe(true);
    const asad = cart.items().find((l) => l.product.slug === 'lattafa-asad')!;
    expect(service.productDiscount(service.applied())).toBe(
      Math.round(asad.variant.price * 10) / 100,
    );
  });

  it('expirado, esgotado e desconhecido não aplicam', () => {
    add('lattafa-asad', 3);
    expect(service.apply('PAIS2026')).toEqual({ ok: false, message: 'Este cupom expirou.' });
    expect(service.apply('INSTA50').ok).toBe(false);
    expect(service.apply('BLACK15').ok).toBe(false); // agendado
    expect(service.apply('XPTO').ok).toBe(false);
    expect(service.applied()).toBeNull();
  });

  it('um uso por cliente: depois de usar, a mesma conta não usa de novo', () => {
    add('lattafa-asad');
    TestBed.inject(AuthService).login('ana@email.com', '12345678');
    expect(service.apply('NANI10').ok).toBe(true);
    const before = service.find('NANI10')!.uses;
    service.recordUse('NANI10', 'ana@email.com', 10);
    expect(service.find('NANI10')!.uses).toBe(before + 1);
    expect(service.problem(service.applied())).toBe('Você já usou este cupom.');
    expect(service.productDiscount(service.applied())).toBe(0);
  });
});
