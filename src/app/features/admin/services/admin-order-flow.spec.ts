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
  it('pagamento só pelo gateway; depois separação → pronto → envio → entrega', () => {
    expect(nextStatus({ ...base, status: 'aguardando-pagamento' })).toBeNull();
    expect(nextStatus({ ...base, status: 'pago' })).toBe('em-separacao');
    expect(nextStatus({ ...base, status: 'em-separacao' })).toBe('pronto-envio');
    expect(nextStatus({ ...base, status: 'pronto-envio' })).toBe('enviado');
    expect(nextStatus({ ...base, status: 'enviado' })).toBe('entregue');
    expect(nextStatus({ ...base, status: 'entregue' })).toBeNull();
  });

  it('cancelar só antes de enviar; rastreio só para transportadora', () => {
    expect(canCancel({ ...base, status: 'pronto-envio' })).toBe(true);
    expect(canCancel({ ...base, status: 'enviado' })).toBe(false);
    expect(needsTracking({ ...base, status: 'em-separacao' })).toBe(false);
    expect(needsTracking({ ...base, status: 'pronto-envio' })).toBe(true);
    expect(needsTracking({ ...base, status: 'pronto-envio', shipping: 'em-maos' })).toBe(false);
    expect(isValidTracking('aa123456789br')).toBe(true);
    expect(isValidTracking('123')).toBe(false);
  });

  it('entrega em mãos: "Pronto para entrega" e depois entregue (sem envio)', () => {
    const inHands = { ...base, shipping: 'em-maos' } as AdminOrder;
    expect(statusLabel('pronto-envio', 'em-maos')).toBe('Pronto para entrega');
    expect(statusLabel('pronto-envio', 'economico')).toBe('Pronto para envio');
    expect(statusLabel('pago', 'economico')).toBe('Pagamento confirmado');
    expect(advanceLabel({ ...inHands, status: 'em-separacao' })).toBe('Pronto para entrega');
    expect(nextStatus({ ...inHands, status: 'pronto-envio' })).toBe('entregue');
    expect(advanceLabel({ ...base, status: 'em-separacao' })).toBe('Pronto para envio');
    expect(advanceLabel({ ...base, status: 'pronto-envio' })).toBe('Marcar como enviado');
  });

  it('a loja avança e cancela pedidos e registra na auditoria', () => {
    localStorage.clear();
    TestBed.inject(AuthService).login('admin@email.com', '12345678');
    const store = TestBed.inject(AdminOrderStore);
    const audit = TestBed.inject(AdminAudit);
    // O mock depende da data de hoje: pega o que houver em aberto (pago ou em separação).
    const target = store.orders().find((order) => ['pago', 'em-separacao'].includes(order.status))!;
    const before = statusLabel(target.status, target.shipping);

    const advanced = store.advance(target.number, 'BR123456789BR')!;
    expect(advanced.status).toBe(target.status === 'pago' ? 'em-separacao' : 'pronto-envio');
    expect(advanced.history.at(-1)?.by).toBe('Admin');
    expect(audit.entries()[0].changes[0]).toEqual({
      field: 'Status',
      before,
      after: statusLabel(advanced.status, target.shipping),
    });

    const open = store.orders().find((order) => canCancel(order))!;
    const cancelled = store.cancel(open.number, 'Cliente desistiu')!;
    expect(cancelled.status).toBe('cancelado');
    expect(cancelled.cancelReason).toBe('Cliente desistiu');
    expect(store.cancel(open.number, 'de novo')).toBeUndefined();
  });
});
