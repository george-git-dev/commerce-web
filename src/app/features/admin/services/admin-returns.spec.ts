import { returnableQuantity } from '../../../core/utils/return-rules';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth-service';
import { CatalogService } from '../../../core/services/catalog-service';
import { OrderService } from '../../../core/services/order-service';
import { ReturnService } from '../../../core/services/return-service';
import { AdminAudit } from './admin-audit';
import { AdminOrderStore } from './admin-order-store';
import { adminItemId, AdminReturns } from './admin-returns';
import { AdminStockStore } from './admin-stock-store';

// Pedidos fictícios do backoffice dependem da data de hoje: data fixa = mesmo resultado sempre.
beforeEach(() => vi.setSystemTime(new Date(2026, 9, 12, 15)));
afterEach(() => vi.useRealTimers());

describe('devoluções', () => {
  beforeEach(() => localStorage.clear());

  it('cliente pede no pedido entregue (no prazo) e não pede duas vezes', () => {
    TestBed.inject(CatalogService);
    const auth = TestBed.inject(AuthService);
    auth.login('bia@email.com', '12345678');
    const order = TestBed.inject(OrderService).find('NP100238')!;
    const returns = TestBed.inject(ReturnService);
    const draft = {
      items: [{ itemId: order.items[0].id, quantity: 1 }],
      reason: 'arrependimento' as const,
      description: '',
      sealedConfirmed: true,
    };
    expect(returns.request(order, draft).ok).toBe(true);
    const created = returns.forOrder('NP100238')[0];
    expect(created.status).toBe('solicitada');
    expect(created.wholeOrder).toBe(true);
    expect(created.refundAmount).toBe(order.total);
    expect(returns.request(order, draft)).toEqual({
      ok: false,
      message: 'Já existe uma devolução em andamento para este pedido.',
    });
    // Entregue há 15 dias: desistência fora do prazo.
    const old = TestBed.inject(OrderService).find('NP100231')!;
    const late = returns.request(old, {
      items: [{ itemId: old.items[0].id, quantity: 1 }],
      reason: 'arrependimento',
      description: '',
    });
    expect(late.ok).toBe(false);
  });

  it('loja aprova e conclui: lacrado volta ao estoque e o estorno fica no pedido', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('admin@email.com', '12345678');
    const admin = TestBed.inject(AdminReturns);
    const stock = TestBed.inject(AdminStockStore);
    const request = admin.all().find((r) => r.status === 'solicitada')!;
    const sku = request.items[0].sku!;
    const before = stock.row(sku)!.variant.stock;

    expect(admin.complete(request, [], true)).toBe(false); // ainda não aprovada
    expect(admin.approve(request)).toBe(true);
    const approved = admin.all().find((r) => r.id === request.id)!;
    expect(admin.completeProblems(approved, [], false).join()).toMatch(/Confirme o estorno/);
    expect(admin.complete(approved, [{ itemId: approved.items[0].itemId, restock: 1 }], true)).toBe(
      true,
    );
    expect(stock.row(sku)!.variant.stock).toBe(before + 1);
    expect(admin.all().find((r) => r.id === request.id)!.status).toBe('concluida');
    expect(TestBed.inject(AdminAudit).entries()[0].action).toBe('Concluiu devolução');
  });

  it('loja registra devolução de pedido entregue (nasce aprovada); visualizador não age', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('admin@email.com', '12345678');
    const admin = TestBed.inject(AdminReturns);
    const orders = TestBed.inject(AdminOrderStore);
    const order = orders.orders().find((o) => o.status === 'entregue' && o.items.length === 1)!;
    const created = admin.register(
      order,
      [{ itemId: adminItemId(order, 0), quantity: order.items[0].quantity }],
      'defeito',
      'Frasco chegou vazando.',
    )!;
    expect(created.status).toBe('aprovada');
    expect(created.createdBy).toBe('Admin');
    admin.complete(created, [{ itemId: created.items[0].itemId, restock: 0 }], true);
    expect(orders.find(order.number)!.refunded).toBe(created.refundAmount);

    auth.logout();
    auth.login('viewer@email.com', '12345678');
    const pending = admin.all().find((r) => r.status === 'solicitada');
    if (pending) expect(admin.approve(pending)).toBe(false);
    expect(admin.canEdit()).toBe(false);
  });

  it('recusa após avaliar o produto: sem estorno, sem estoque e não dá para pedir de novo', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('admin@email.com', '12345678');
    const admin = TestBed.inject(AdminReturns);
    const stock = TestBed.inject(AdminStockStore);
    const request = admin.all().find((r) => r.status === 'solicitada')!;
    const sku = request.items[0].sku!;
    const before = stock.row(sku)!.variant.stock;
    admin.approve(request);
    const approved = admin.all().find((r) => r.id === request.id)!;
    expect(admin.refuseAfterReview(approved, 'ok')).toBe(false); // motivo curto
    expect(admin.refuseAfterReview(approved, 'Frasco aberto e usado.')).toBe(true);
    const refused = admin.all().find((r) => r.id === request.id)!;
    expect(refused.status).toBe('recusada');
    expect(refused.decision?.afterReview).toBe(true);
    expect(stock.row(sku)!.variant.stock).toBe(before);
    expect(returnableQuantity({ id: refused.items[0].itemId, quantity: 1 }, [refused])).toBe(0);
    expect(TestBed.inject(AdminAudit).entries()[0].action).toBe('Recusou devolução após avaliação');
  });
});
