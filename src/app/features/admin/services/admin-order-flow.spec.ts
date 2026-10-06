import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth-service';
import { AdminOrder } from '../data/admin-orders-mock';
import {
  advanceLabel,
  canCancel,
  isValidTracking,
  needsTracking,
  nextStatus,
  statusLabel,
} from './admin-order-flow';
import { AdminAudit } from './admin-audit';
import { AdminOrderStore } from './admin-order-store';

const base = { shipping: 'economico' } as AdminOrder;

describe('fluxo de status do pedido (admin)', () => {
  it('pagamento só pelo gateway; depois separação → envio → entrega', () => {
    expect(nextStatus({ ...base, status: 'aguardando-pagamento' })).toBeNull();
    expect(nextStatus({ ...base, status: 'pago' })).toBe('em-separacao');
    expect(nextStatus({ ...base, status: 'em-separacao' })).toBe('enviado');
    expect(nextStatus({ ...base, status: 'enviado' })).toBe('entregue');
    expect(nextStatus({ ...base, status: 'entregue' })).toBeNull();
  });

  it('cancelar só antes de enviar; rastreio só para transportadora', () => {
    expect(canCancel({ ...base, status: 'em-separacao' })).toBe(true);
    expect(canCancel({ ...base, status: 'enviado' })).toBe(false);
    expect(needsTracking({ ...base, status: 'em-separacao' })).toBe(true);
    expect(needsTracking({ ...base, status: 'em-separacao', shipping: 'em-maos' })).toBe(false);
    expect(isValidTracking('aa123456789br')).toBe(true);
    expect(isValidTracking('123')).toBe(false);
  });

  it('entrega em mãos: "Pronto para entrega" no lugar de "Enviado"', () => {
    expect(statusLabel('enviado', 'em-maos')).toBe('Pronto para entrega');
    expect(statusLabel('enviado', 'economico')).toBe('Enviado');
    expect(advanceLabel({ ...base, status: 'em-separacao', shipping: 'em-maos' })).toBe(
      'Pronto para entrega',
    );
  });

  it('a loja avança e cancela pedidos e registra na auditoria', () => {
    localStorage.clear();
    TestBed.inject(AuthService).login('admin@email.com', '12345678');
    const store = TestBed.inject(AdminOrderStore);
    const audit = TestBed.inject(AdminAudit);
    const paid = store.orders().find((order) => order.status === 'pago')!;

    const separated = store.advance(paid.number)!;
    expect(separated.status).toBe('em-separacao');
    expect(separated.history.at(-1)?.by).toBe('Admin');
    expect(audit.entries()[0].changes[0]).toEqual({
      field: 'Status',
      before: 'Pago',
      after: 'Em separação',
    });

    const cancelled = store.cancel(paid.number, 'Cliente desistiu')!;
    expect(cancelled.status).toBe('cancelado');
    expect(cancelled.cancelReason).toBe('Cliente desistiu');
    expect(store.cancel(paid.number, 'de novo')).toBeUndefined();
  });
});
