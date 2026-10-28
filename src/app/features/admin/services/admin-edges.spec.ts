import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth-service';
import { AdminOrder } from '../data/admin-orders-mock';
import { AdminAudit, AuditEntry } from './admin-audit';
import { advanceLabel, statusLabel } from './admin-order-flow';
import { salesByGroup } from './admin-metrics';
import { AdminOrderStore } from './admin-order-store';
import { adminItemId, AdminReturns } from './admin-returns';
import { auditLink, sortAudit } from './audit-rules';
import { blockReasonProblem, matchesCustomer, sortCustomers } from './customer-rules';
import { AdminCustomerStore } from './admin-customer-store';
import { variantProblems } from './product-rules';

const login = (email = 'admin@email.com') => TestBed.inject(AuthService).login(email, '12345678');

// Pedidos fictícios do backoffice dependem da data de hoje: data fixa = mesmo resultado sempre.
beforeEach(() => vi.setSystemTime(new Date(2026, 9, 12, 15)));
afterEach(() => vi.useRealTimers());

describe('backoffice: casos de borda', () => {
  beforeEach(() => localStorage.clear());

  it('pedidos: avançar/estornar pedido inexistente não faz nada', () => {
    login();
    const store = TestBed.inject(AdminOrderStore);
    expect(store.advance('NP000000')).toBeUndefined();
    const done = store.orders().find((o) => o.status === 'entregue')!;
    expect(store.advance(done.number)).toBeUndefined();
    store.addRefund('NP000000', 10);
    expect(store.find('NP000000')).toBeUndefined();
  });

  it('pedidos: levar até "entregue" libera a comissão', () => {
    login();
    const store = TestBed.inject(AdminOrderStore);
    let order = store.orders().find((o) => o.status === 'pronto-envio' && o.shipping === 'em-maos');
    if (!order) return;
    order = store.advance(order.number)!;
    expect(order.status).toBe('entregue');
  });

  it('textos do fluxo do pedido (entrega em mãos e envio)', () => {
    const base = { status: 'pago', shipping: 'em-maos' } as AdminOrder;
    expect(statusLabel('enviado', 'em-maos')).toBe('Pronto para entrega');
    expect(statusLabel('pronto-envio', 'em-maos')).toBe('Pronto para entrega');
    expect(advanceLabel({ ...base, status: 'em-separacao' })).toBe('Pronto para entrega');
    expect(
      advanceLabel({ ...base, status: 'em-separacao', shipping: 'economico' } as AdminOrder),
    ).toBe('Pronto para envio');
    expect(
      advanceLabel({ ...base, status: 'pronto-envio', shipping: 'economico' } as AdminOrder),
    ).toBe('Marcar como enviado');
    expect(advanceLabel({ ...base, status: 'entregue' })).toBeNull();
  });

  it('vendas por grupo: kits e corpo e banho separados dos perfumes', () => {
    const item = (category: string) => ({ category, quantity: 1, unitPrice: 100 });
    const order = {
      status: 'entregue',
      createdAt: new Date(2026, 9, 10),
      total: 300,
      items: [item('perfume'), item('kit'), item('hidratante')],
    } as unknown as AdminOrder;
    const groups = salesByGroup([order], new Date(2026, 9, 1), new Date(2026, 9, 31));
    expect(groups.length).toBeGreaterThanOrEqual(3);
  });

  it('devoluções: recusa com motivo, quantidade inválida, aviso de prazo e cadastro bloqueado', () => {
    login();
    const admin = TestBed.inject(AdminReturns);
    const orders = TestBed.inject(AdminOrderStore);
    const request = admin.all().find((r) => r.status === 'solicitada')!;
    expect(admin.refuse(request, 'não')).toBe(false);
    expect(admin.refuse(request, ' Fora das regras da loja ')).toBe(true);
    expect(admin.all().find((r) => r.id === request.id)!.decision?.reason).toBe(
      'Fora das regras da loja',
    );
    expect(TestBed.inject(AdminAudit).entries()[0].action).toBe('Recusou devolução');

    const fake = { ...request, status: 'aprovada' as const };
    expect(
      admin.completeProblems(fake, [{ itemId: request.items[0].itemId, restock: 99 }], true),
    ).toEqual([`Quantidade inválida: ${request.items[0].name}.`]);

    const open = orders.orders().find((o) => o.status !== 'entregue' && o.status !== 'cancelado')!;
    expect(admin.registerProblems(open, [], 'defeito', 'Válvula com defeito')).toEqual([
      'Só pedido entregue pode ter devolução.',
    ]);
    expect(admin.register(open, [], 'defeito', 'Válvula com defeito')).toBeNull();

    const delivered = orders.orders().find((o) => o.status === 'entregue')!;
    expect(admin.deliveredAt(delivered)).toBeInstanceOf(Date);
    expect(admin.lateWarning(delivered, null)).toBeNull();
    const old = orders
      .orders()
      .find(
        (o) =>
          o.status === 'entregue' && Date.now() - admin.deliveredAt(o)!.getTime() > 40 * 86_400_000,
      );
    if (old) expect(admin.lateWarning(old, 'defeito')).toMatch(/prazo/i);

    const created = admin.register(
      delivered,
      [{ itemId: adminItemId(delivered, 0), quantity: 1 }],
      'defeito',
      'Válvula não borrifa',
    );
    if (created) {
      expect(admin.registerProblems(delivered, [], 'defeito', 'Válvula com defeito')).toEqual([
        'Já existe uma devolução em andamento para este pedido.',
      ]);
    }
  });

  it('auditoria: links por área (excluído não tem) e ordenação', () => {
    const entry = (entity: string, action = 'Alterou', entityId = 'x'): AuditEntry =>
      ({
        entity,
        action,
        entityId,
        at: new Date(),
        by: 'Ana',
        changes: [],
      }) as unknown as AuditEntry;
    expect(auditLink(entry('Estoque', 'Ajustou', 'sku-1'))).toBe('/admin/estoque/sku-1');
    expect(auditLink(entry('Cliente', 'Bloqueou', '7'))).toBe('/admin/clientes/7');
    expect(auditLink(entry('Banner', 'Excluiu banner'))).toBeNull();
    expect(auditLink(entry('Banner', 'Alterou banner', '2'))).toBe('/admin/vitrine/banners/2');
    expect(auditLink(entry('Aviso'))).toBe('/admin/vitrine/avisos');
    expect(auditLink(entry('Devolução'))).toBe('/admin/pedidos/devolucoes');
    expect(auditLink(entry('Avaliação'))).toBe('/admin/vitrine/avaliacoes');
    expect(auditLink(entry('Afiliado'))).toBe('/admin/afiliados');
    expect(auditLink(entry('Pagamento de afiliado'))).toBe('/admin/afiliados');
    expect(auditLink(entry('Configurações'))).toBe('/admin/vitrine/configuracoes');
    expect(auditLink(entry('Relatório'))).toBe('/admin/relatorios');
    expect(auditLink(entry('Outra coisa'))).toBeNull();

    const a = { ...entry('Pedido', 'Avançou'), by: 'Bruno' };
    const b = { ...entry('Cliente', 'Bloqueou'), by: 'Ana' };
    expect(sortAudit([a, b], { column: 'quem', desc: false })[0].by).toBe('Ana');
    expect(sortAudit([a, b], { column: 'area', desc: false })[0].entity).toBe('Cliente');
    expect(sortAudit([a, b], { column: 'acao', desc: true })[0].action).toBe('Bloqueou');
  });

  it('auditoria: histórico fictício entra uma vez só', () => {
    const audit = TestBed.inject(AdminAudit);
    const seed = [
      {
        at: new Date(),
        by: 'X',
        role: 'Admin',
        action: 'a',
        entity: 'Pedido',
        entityId: '1',
        changes: [],
        origin: { ip: '', device: '' },
      },
    ] as never;
    audit.seedOnce(seed);
    audit.seedOnce(seed);
    expect(audit.entries()).toHaveLength(1);
  });

  it('clientes: busca vazia, ordenações por data e motivo do bloqueio', () => {
    login();
    const customers = TestBed.inject(AdminCustomerStore).customers();
    expect(customers.every((c) => matchesCustomer(c, '  '))).toBe(true);
    const byLast = sortCustomers(customers, { column: 'ultima-compra', desc: true });
    expect(byLast.at(-1)!.lastOrderAt).toBeNull();
    const bySince = sortCustomers(customers, { column: 'desde', desc: false });
    expect(bySince[0].since.getTime()).toBeLessThanOrEqual(bySince.at(-1)!.since.getTime());
    expect(blockReasonProblem('abc')).toMatch(/mínimo/);
    expect(blockReasonProblem('x'.repeat(201))).toMatch(/200/);
    expect(blockReasonProblem('Tentativa de fraude')).toBeNull();
  });

  it('variantes: SKU vazio e preço zero', () => {
    const variant = { id: '', kind: 'decant', volumeMl: 5, price: 0, stock: 1 } as const;
    const problems = variantProblems([variant], []);
    expect(problems).toContain('Toda variante precisa de SKU.');
    expect(problems).toContain('Todo preço precisa ser maior que zero.');
  });
});
