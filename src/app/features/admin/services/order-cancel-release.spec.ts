import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth-service';
import { CouponService } from '../../../core/services/coupon-service';
import { PromotionService } from '../../../core/services/promotion-service';
import { AdminAudit } from './admin-audit';
import { canCancel } from './admin-order-flow';
import { AdminOrderStore } from './admin-order-store';

describe('cancelar pedido devolve cupom e unidades de promoção', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.inject(AuthService).login('admin@email.com', '12345678');
  });

  it('uso do cupom e desconto dado voltam; auditoria registra', () => {
    const store = TestBed.inject(AdminOrderStore);
    const coupons = TestBed.inject(CouponService);
    const order = store.orders().find((o) => o.coupon && canCancel(o))!;
    expect(order).toBeTruthy();
    const before = coupons.find('NANI10')!;

    store.cancel(order.number, 'Cliente desistiu');

    const after = coupons.find('NANI10')!;
    expect(after.uses).toBe(before.uses - 1);
    expect(after.discountGiven).toBeCloseTo(before.discountGiven - order.coupon!.discount, 2);
    const changes = TestBed.inject(AdminAudit).entries()[0].changes;
    expect(changes).toContainEqual({
      field: 'Cupom',
      before: 'NANI10 usado',
      after: 'Uso devolvido',
    });
  });

  it('unidades vendidas na promoção voltam ao limite (nunca abaixo de zero)', () => {
    const promotions = TestBed.inject(PromotionService);
    const promo = promotions.all().find((p) => p.unitLimit)!;
    promotions.release(promo.id, 1);
    expect(promotions.all().find((p) => p.id === promo.id)!.sold).toBe(Math.max(0, promo.sold - 1));
    promotions.release(promo.id, 999);
    expect(promotions.all().find((p) => p.id === promo.id)!.sold).toBe(0);
  });
});
