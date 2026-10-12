import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth-service';
import { CommissionService } from '../../../core/services/commission-service';
import { AdminAudit } from './admin-audit';
import { AdminCommissions } from './admin-commissions';

describe('comissões no backoffice', () => {
  beforeEach(() => localStorage.clear());

  it('fecha (Pix fica a pagar), marca pago e audita', () => {
    TestBed.inject(AuthService).login('admin@email.com', '12345678');
    const store = TestBed.inject(AdminCommissions);
    expect(store.closingPreview().count).toBeGreaterThan(0);
    const result = store.close()!;
    const pix = result.created.find((p) => p.method === 'pix')!;
    expect(pix.status).toBe('a-pagar');
    expect(store.totals().toPay).toBeGreaterThan(0);
    expect(store.markPaid(pix)).toBe(true);
    expect(TestBed.inject(AdminAudit).entries()[0].action).toBe('Marcou Pix de comissão como pago');
    expect(store.markPaid(pix)).toBe(false);
  });

  it('visualizador vê, mas não fecha nem paga', () => {
    TestBed.inject(AuthService).login('viewer@email.com', '12345678');
    const store = TestBed.inject(AdminCommissions);
    expect(store.close()).toBeNull();
  });

  it('pedido cancelado cancela a comissão aberta', () => {
    const service = TestBed.inject(CommissionService);
    const open = service.commissions().find((c) => c.state === 'aberta' && !c.deliveredAt)!;
    expect(service.cancelByOrder(open.orderNumber)).toBe(true);
    expect(service.commissions().find((c) => c.id === open.id)!.state).toBe('cancelada');
  });
});
