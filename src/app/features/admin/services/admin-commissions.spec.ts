import { TestBed } from '@angular/core/testing';
import { AffiliateService } from '../../../core/services/affiliate-service';
import { AuthService } from '../../../core/services/auth-service';
import { CommissionService } from '../../../core/services/commission-service';
import { AdminAudit } from './admin-audit';
import { AdminCommissions } from './admin-commissions';

const receipt = { name: 'pix.pdf', type: 'application/pdf', size: 20_000, url: 'blob:x' };

describe('comissões no backoffice', () => {
  beforeEach(() => localStorage.clear());

  it('paga por afiliado: Pix exige comprovante, que fica no pagamento; audita', () => {
    TestBed.inject(AuthService).login('admin@email.com', '12345678');
    const store = TestBed.inject(AdminCommissions);
    const julia = TestBed.inject(AffiliateService).approvedBy('julia.afiliada@email.com')!;
    const plan = store.preview(julia);
    expect(plan.method).toBe('pix');
    expect(plan.commissionIds.length).toBeGreaterThan(0);
    expect(store.pay(julia)).toBeNull(); // sem comprovante
    const payout = store.pay(julia, receipt)!;
    expect(payout.receipt?.name).toBe('pix.pdf');
    expect(payout.amount).toBe(plan.amount);
    expect(TestBed.inject(AdminAudit).entries()[0].action).toBe('Pagou comissão por Pix');
    expect(store.preview(julia).commissionIds.length).toBe(0);
  });

  it('visualizador vê, mas não paga', () => {
    TestBed.inject(AuthService).login('viewer@email.com', '12345678');
    const store = TestBed.inject(AdminCommissions);
    const julia = TestBed.inject(AffiliateService).approvedBy('julia.afiliada@email.com')!;
    expect(store.pay(julia, receipt)).toBeNull();
    expect(store.pixToPay(julia)).not.toBe(julia.pixKey);
  });

  it('pedido cancelado cancela a comissão aberta', () => {
    const service = TestBed.inject(CommissionService);
    const open = service.commissions().find((c) => c.state === 'aberta' && !c.deliveredAt)!;
    expect(service.cancelByOrder(open.orderNumber)).toBe(true);
    expect(service.commissions().find((c) => c.id === open.id)!.state).toBe('cancelada');
  });
});
