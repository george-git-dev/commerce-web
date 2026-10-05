import { TestBed } from '@angular/core/testing';
import { MOCK_PRODUCTS } from '../data/mock-products';
import { AuthService } from './auth-service';
import { CartStore } from './cart-store';
import { CouponService } from './coupon-service';
import { OrderService } from './order-service';
import { OrderSummary } from './order-summary';
import { ShippingService } from './shipping-service';

describe('OrderSummary', () => {
  let summary: OrderSummary;

  beforeEach(() => {
    localStorage.clear();
    summary = TestBed.inject(OrderSummary);
    const asad = MOCK_PRODUCTS.find((product) => product.slug === 'lattafa-asad')!;
    TestBed.inject(CartStore).add(asad, asad.variants[0]);
  });

  it('soma subtotal, desconto do cupom e frete escolhido', () => {
    TestBed.inject(ShippingService).cep.set('01310100');
    TestBed.inject(CouponService).apply('NANI10', summary.subtotal());
    summary.shippingId.set('expresso');

    const expected = summary.subtotal() - summary.discount() + summary.selectedShipping()!.price;
    expect(summary.discount()).toBeGreaterThan(0);
    expect(summary.total()).toBeCloseTo(expected, 2);
  });

  it('sem desconto no Pix enquanto a configuração estiver em 0%', () => {
    summary.paymentMethod.set('pix');
    expect(summary.pixDiscount()).toBe(0);
  });

  it('cria o pedido com número e status pelo meio de pagamento', () => {
    const auth = TestBed.inject(AuthService);
    const orders = TestBed.inject(OrderService);
    auth.login('maria@email.com', '12345678');
    const address = {
      cep: '01310-100',
      street: 'Rua',
      number: '1',
      complement: '',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
    };
    const base = {
      items: [],
      address: { recipient: 'Maria', ...address },
      billing: { document: '529.982.247-25', name: 'Maria', address },
      shipping: { id: 'economico' as const, label: 'Econômico', minDays: 3, maxDays: 5, price: 0 },
      subtotal: 100,
      discount: 0,
      pixDiscount: 0,
      shippingPrice: 0,
      total: 100,
    };
    const pix = orders.place({ ...base, payment: { method: 'pix' } });
    expect(pix.number).toMatch(/^NP\d{6}$/);
    expect(pix.status).toBe('aguardando-pagamento');
    expect(orders.find(pix.number)).toBe(pix);
    expect(orders.place({ ...base, payment: { method: 'cartao' } }).status).toBe('pago');

    // Pedido fica só na conta que comprou.
    auth.logout();
    auth.login('outra@email.com', '12345678');
    expect(orders.find(pix.number)).toBeUndefined();
  });
});
