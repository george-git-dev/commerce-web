import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth-service';
import { OrderService } from './order-service';
import { ReviewService } from './review-service';

describe('OrderService (pedidos por conta)', () => {
  beforeEach(() => localStorage.clear());

  it('sem login não há pedidos; logado vê os 4 de exemplo', () => {
    const auth = TestBed.inject(AuthService);
    const orders = TestBed.inject(OrderService);
    expect(orders.orders().length).toBe(0);

    auth.login('maria@email.com', '12345678');
    expect(orders.orders().map((order) => order.status)).toEqual([
      'aguardando-pagamento',
      'enviado',
      'entregue',
      'entregue',
    ]);
    expect(orders.find('NP100245')?.trackingCode).toBe('BR123456789BR');
  });

  it('total dos exemplos fecha com subtotal, descontos e frete', () => {
    TestBed.inject(AuthService).login('maria@email.com', '12345678');
    for (const order of TestBed.inject(OrderService).orders()) {
      const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      expect(order.subtotal).toBeCloseTo(subtotal, 2);
      expect(order.total).toBeCloseTo(
        order.subtotal - order.discount - order.pixDiscount + order.shippingPrice,
        2,
      );
    }
  });
});

describe('ReviewService', () => {
  it('um envio por item do pedido', () => {
    const reviews = TestBed.inject(ReviewService);
    const review = {
      orderNumber: 'NP100231',
      itemId: 'NP100231-0',
      slug: 'lattafa-asad',
      productName: 'Asad',
      variantLabel: 'Frasco 100 ml',
      rating: 5,
      comment: 'Fixação excelente.',
    };
    expect(reviews.isReviewed('NP100231', 'NP100231-0')).toBe(false);
    reviews.submit(review);
    reviews.submit({ ...review, rating: 1 });
    expect(reviews.isReviewed('NP100231', 'NP100231-0')).toBe(true);
    expect(reviews.isReviewed('NP100231', 'NP100231-1')).toBe(false);
  });

  it('conta só os pedidos da sessão: em andamento, já comprou e dono', () => {
    const auth = TestBed.inject(AuthService);
    const orders = TestBed.inject(OrderService);
    auth.login('novo.cliente@email.com', '12345678');
    expect(orders.ownerEmail()).toBe('novo.cliente@email.com');
    expect(orders.hasPlaced('novo.cliente@email.com')).toBe(false);
    const sample = orders.orders()[0];
    const { number, createdAt, status, ...draft } = sample;
    void number;
    void createdAt;
    void status;
    const placed = orders.place({ ...draft, payment: { method: 'pix' }, total: 100 });
    expect(placed.status).toBe('aguardando-pagamento');
    expect(orders.openPlacedCount('novo.cliente@email.com')).toBe(1);
    expect(orders.hasPlaced('novo.cliente@email.com')).toBe(true);
    expect(orders.find(placed.number)?.number).toBe(placed.number);
    const paidWithCredit = orders.place({ ...draft, payment: { method: 'pix' }, total: 0 });
    expect(paidWithCredit.status).toBe('pago');
    auth.logout();
    expect(orders.ownerEmail()).toBe('');
  });
});
