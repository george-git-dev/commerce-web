import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth-service';
import { OrderService } from './order-service';
import { ReviewService } from './review-service';

describe('OrderService (pedidos por conta)', () => {
  beforeEach(() => localStorage.clear());

  it('sem login não há pedidos; logado vê os 3 de exemplo', () => {
    const auth = TestBed.inject(AuthService);
    const orders = TestBed.inject(OrderService);
    expect(orders.orders().length).toBe(0);

    auth.login('maria@email.com', '12345678');
    expect(orders.orders().map((order) => order.status)).toEqual([
      'aguardando-pagamento',
      'enviado',
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
      rating: 5,
      comment: 'Fixação excelente.',
    };
    expect(reviews.isReviewed('NP100231', 'NP100231-0')).toBe(false);
    reviews.submit(review);
    reviews.submit({ ...review, rating: 1 });
    expect(reviews.isReviewed('NP100231', 'NP100231-0')).toBe(true);
    expect(reviews.isReviewed('NP100231', 'NP100231-1')).toBe(false);
  });
});
