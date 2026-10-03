import { TestBed } from '@angular/core/testing';
import { CouponService } from './coupon-service';

describe('CouponService', () => {
  let service: CouponService;

  beforeEach(() => {
    service = TestBed.inject(CouponService);
  });

  it('aplica cupom de porcentagem, sem diferenciar maiúsculas', () => {
    const result = service.apply(' nani10 ', 299.9);
    expect(result.ok).toBe(true);
    expect(service.productDiscount(service.applied(), 299.9)).toBe(29.99);
  });

  it('respeita o subtotal mínimo e para de valer se o carrinho diminuir', () => {
    expect(service.apply('BEMVINDO30', 150).ok).toBe(false);
    expect(service.apply('BEMVINDO30', 250).ok).toBe(true);
    expect(service.productDiscount(service.applied(), 250)).toBe(30);
    expect(service.productDiscount(service.applied(), 150)).toBe(0);
  });

  it('rejeita código desconhecido', () => {
    const result = service.apply('XPTO', 500);
    expect(result.ok).toBe(false);
    expect(service.applied()).toBeNull();
  });
});
