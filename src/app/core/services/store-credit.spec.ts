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

  it('fechar com crédito: comissões viram pagas e o saldo entra com +10%', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('julia.afiliada@email.com', '12345678');
    const service = TestBed.inject(CommissionService);
    const credit = TestBed.inject(StoreCredit);
    TestBed.inject(AffiliateService).setPayoutMethod('credito');
    const before = credit.myBalance();
    const { created } = service.close();
    expect(created.length).toBe(1);
    expect(created[0].method).toBe('credito');
    expect(created[0].paidAmount).toBeCloseTo(created[0].amount * 1.1, 2);
    expect(credit.myBalance()).toBeCloseTo(before + created[0].paidAmount, 2);
    // fechar de novo não paga duas vezes
    expect(service.close().created.length).toBe(0);
  });
});
