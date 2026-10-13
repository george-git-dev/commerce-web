import { TestBed } from '@angular/core/testing';
import { AffiliateService } from './affiliate-service';
import { AuthService } from './auth-service';
import { CartStore } from './cart-store';
import { CatalogService } from './catalog-service';
import { CommissionService } from './commission-service';
import { OrderSummary } from './order-summary';
import { StoreCredit } from './store-credit';

describe('crédito na loja e fechamento', () => {
  beforeEach(() => localStorage.clear());

  it('afiliada usa o saldo no checkout, até o total do pedido', () => {
    TestBed.inject(AuthService).login('julia.afiliada@email.com', '12345678');
    const credit = TestBed.inject(StoreCredit);
    const summary = TestBed.inject(OrderSummary);
    const balance = credit.myBalance();
    expect(balance).toBeGreaterThan(0);
    const decant = TestBed.inject(CatalogService)
      .products()
      .find((p) => p.slug === 'lattafa-asad')!;
    TestBed.inject(CartStore).add(
      decant,
      decant.variants.find((v) => v.id === 'lattafa-asad-d5')!,
    );
    summary.useCredit.set(true);
    expect(summary.creditApplied()).toBe(Math.min(balance, summary.totalBeforeCredit()));
    expect(summary.total()).toBe(
      Math.max(0, Math.round((summary.totalBeforeCredit() - balance) * 100) / 100),
    );
    expect(credit.use('julia.afiliada@email.com', balance + 1, 'NP1')).toBe(false);
  });

  it('pagar em crédito: comissões viram pagas e o saldo entra com +10%', () => {
    TestBed.inject(AuthService).login('julia.afiliada@email.com', '12345678');
    const service = TestBed.inject(CommissionService);
    const credit = TestBed.inject(StoreCredit);
    TestBed.inject(AffiliateService).setPayoutMethod('credito');
    const before = credit.myBalance();
    const payout = service.pay('julia.afiliada@email.com', 'George')!;
    expect(payout.method).toBe('credito');
    expect(payout.receipt).toBeUndefined();
    expect(payout.paidAmount).toBeCloseTo(payout.amount * 1.1, 2);
    expect(credit.myBalance()).toBeCloseTo(before + payout.paidAmount, 2);
    // pagar de novo não paga duas vezes
    expect(service.pay('julia.afiliada@email.com', 'George')).toBeNull();
  });

  it('não usa mais que o saldo; estorno devolve; valores inválidos são ignorados', () => {
    const credit = TestBed.inject(StoreCredit);
    const email = 'teste.credito@email.com';
    credit.addCommission(email, 100, 1);
    expect(credit.balanceOf(email)).toBe(100);
    expect(credit.use(email, 150, 'NP1')).toBe(false);
    expect(credit.use(email, 0, 'NP1')).toBe(false);
    expect(credit.use(email, 40, 'NP1')).toBe(true);
    expect(credit.balanceOf(email)).toBe(60);
    credit.refund(email, 0, 'NP1');
    credit.refund(email, 40, 'NP1');
    expect(credit.balanceOf(email)).toBe(100);
  });
});
