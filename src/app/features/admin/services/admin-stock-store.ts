import { computed, inject, Injectable, signal } from '@angular/core';
import { Product, ProductVariant } from '../../../core/models/product';
import { AuthService } from '../../../core/services/auth-service';
import { AdminAudit } from './admin-audit';
import { AdminOrderStore } from './admin-order-store';
import { AdminProductStore } from './admin-product-store';
import { PURCHASES_MOCK, SUPPLIERS_MOCK } from '../data/purchases-mock';
import { averageCost, PurchaseEntry } from './purchase-rules';
import { DEFAULT_MIN_STOCK, StockDirection, StockStatus, stockStatus } from './stock-rules';

export type StockMoveType = 'inicial' | 'entrada' | 'saida' | 'venda';

/** Uma movimentação: quanto entrou/saiu, saldo depois, quem e por quê. */
export interface StockMove {
  id: number;
  sku: string;
  at: Date;
  type: StockMoveType;
  /** Positivo = entrou; negativo = saiu. */
  quantity: number;
  balance: number;
  by: string;
  reason: string;
  note?: string;
  /** Pedido (NP…) ou nota do fornecedor (NF …). */
  reference?: string;
  /** Rota da referência (detalhe do pedido ou da entrada). */
  link?: readonly (string | number)[];
}

/** Uma linha da tela de estoque: um frasco ou um tamanho de decant. */
export interface StockRow {
  product: Product;
  variant: ProductVariant;
  min: number;
  status: StockStatus;
  /** Custo médio ponderado das compras; ausente = sem compra registrada. */
  cost?: number;
}

/** Pedidos que já baixaram estoque (pago em diante, menos cancelado). */
const SOLD = ['pago', 'em-separacao', 'enviado', 'entregue'];

/**
 * Estoque do backoffice (mock em memória). O saldo mora na variante do
 * produto (`AdminProductStore`); aqui ficam mínimos e movimentações.
 * Fase 2 (B7): `stock_movement` só de inclusão, gravada na mesma transação
 * do saldo; venda paga baixa sozinha; `PATCH /admin/stock/{sku}`.
 */
@Injectable({ providedIn: 'root' })
export class AdminStockStore {
  private readonly products = inject(AdminProductStore);
  private readonly orders = inject(AdminOrderStore);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);

  private readonly minimums = signal<Readonly<Record<string, number>>>({});
  private readonly costs = signal<Readonly<Record<string, number>>>(this.seedCosts());
  private readonly moves = signal<readonly StockMove[]>(this.seed());

  /** Custo médio por SKU (painel: lucro bruto e margem). */
  readonly costBySku = this.costs.asReadonly();

  readonly rows = computed<StockRow[]>(() =>
    this.products.products().flatMap((product) =>
      product.variants.map((variant) => {
        const min = this.minimums()[variant.id] ?? DEFAULT_MIN_STOCK;
        return {
          product,
          variant,
          min,
          status: stockStatus(variant.stock, min),
          cost: this.costs()[variant.id],
        };
      }),
    ),
  );

  /** Variantes com estoque baixo ou zerado (painel, lista de produtos). */
  readonly alertCount = computed(() => this.rows().filter((row) => row.status !== 'ok').length);

  row(sku: string | null): StockRow | undefined {
    return this.rows().find((row) => row.variant.id === sku);
  }

  minimum(sku: string): number {
    return this.minimums()[sku] ?? DEFAULT_MIN_STOCK;
  }

  /** Histórico de um SKU, mais recente primeiro. */
  history(sku: string): StockMove[] {
    return this.moves()
      .filter((move) => move.sku === sku)
      .sort((a, b) => b.at.getTime() - a.at.getTime() || b.id - a.id);
  }

  /** Lançamento manual. Quem chama valida antes (`adjustProblems`). */
  adjust(
    sku: string,
    direction: StockDirection,
    quantity: number,
    reason: string,
    note?: string,
  ): void {
    const row = this.row(sku);
    if (!row) return;
    const delta = direction === 'entrada' ? quantity : -quantity;
    const balance = row.variant.stock + delta;
    if (balance < 0) return;
    this.products.setStock(sku, balance);
    this.add({ sku, type: direction, quantity: delta, balance, reason, note: note || undefined });
    this.audit.record({
      by: this.userName(),
      action: 'Ajustou estoque',
      entity: 'Estoque',
      entityId: sku,
      changes: [
        { field: `Estoque (${reason})`, before: String(row.variant.stock), after: String(balance) },
      ],
    });
  }

  setMinimum(sku: string, min: number): void {
    const before = this.minimum(sku);
    if (before === min) return;
    this.minimums.update((all) => ({ ...all, [sku]: min }));
    this.audit.record({
      by: this.userName(),
      action: 'Alterou estoque mínimo',
      entity: 'Estoque',
      entityId: sku,
      changes: [{ field: 'Mínimo', before: String(before), after: String(min) }],
    });
  }

  /**
   * Recebimento de uma entrada de mercadoria: soma cada item no saldo,
   * atualiza o custo médio e registra a movimentação com a nota.
   */
  receive(entry: PurchaseEntry, supplierName: string): void {
    for (const item of entry.items) {
      const row = this.row(item.sku);
      if (!row) continue;
      const balance = row.variant.stock + item.quantity;
      const cost = averageCost(row.variant.stock, row.cost, item.quantity, item.unitCost);
      this.costs.update((all) => ({ ...all, [item.sku]: cost }));
      this.products.setStock(item.sku, balance);
      this.add({
        sku: item.sku,
        type: 'entrada',
        quantity: item.quantity,
        balance,
        reason: 'Entrada de mercadoria',
        note: supplierName,
        reference: `NF ${entry.invoice}`,
        link: ['/admin/estoque/entradas', entry.id],
      });
    }
  }

  private add(move: Omit<StockMove, 'id' | 'at' | 'by'>): void {
    this.moves.update((list) => [
      ...list,
      { ...move, id: list.length + 1, at: new Date(), by: this.userName() },
    ]);
  }

  private userName(): string {
    return this.auth.user()?.name ?? 'Equipe';
  }

  /**
   * Custo médio inicial: o do saldo de cadastro (FICTÍCIO, 45–64% do preço,
   * varia por produto para a margem não sair igual) e, por cima, as compras
   * recebidas do mock. Na Fase 2 a carga do saldo inicial traz o custo real.
   */
  private seedCosts(): Record<string, number> {
    const costs: Record<string, number> = {};
    const stockSoFar: Record<string, number> = {};
    this.products.products().forEach((product, index) => {
      const ratio = 0.45 + ((index * 7) % 20) / 100;
      for (const variant of product.variants) {
        costs[variant.id] = Math.round(variant.price * ratio * 100) / 100;
      }
    });
    for (const entry of PURCHASES_MOCK.filter((e) => e.status === 'recebido')) {
      for (const item of entry.items) {
        const before = stockSoFar[item.sku] ?? 0;
        costs[item.sku] = averageCost(before, costs[item.sku], item.quantity, item.unitCost);
        stockSoFar[item.sku] = before + item.quantity;
      }
    }
    return costs;
  }

  /**
   * Histórico fictício coerente com o saldo atual: saldo inicial, as compras
   * recebidas do mock e uma baixa por venda paga (no SKU vendido).
   */
  private seed(): StockMove[] {
    const orders = [...this.orders.orders()]
      .filter((order) => SOLD.includes(order.status))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    // Saldo inicial um dia antes do primeiro pedido do mock.
    const start = new Date((orders[0]?.createdAt.getTime() ?? Date.now()) - 86_400_000);
    const received = PURCHASES_MOCK.filter((entry) => entry.status === 'recebido');
    const moves: StockMove[] = [];
    for (const product of this.products.products()) {
      for (const variant of product.variants) {
        type Event = Omit<StockMove, 'id' | 'sku' | 'balance'>;
        const events: Event[] = [];
        for (const order of orders) {
          for (const item of order.items.filter((i) => i.sku === variant.id)) {
            events.push({
              at: order.createdAt,
              type: 'venda',
              quantity: -item.quantity,
              by: 'Sistema',
              reason: 'Venda',
              reference: order.number,
              link: ['/admin/pedidos', order.number],
            });
          }
        }
        for (const entry of received) {
          for (const item of entry.items.filter((i) => i.sku === variant.id)) {
            events.push({
              at: entry.receivedAt ?? entry.date,
              type: 'entrada',
              quantity: item.quantity,
              by: entry.receivedBy ?? 'George',
              reason: 'Entrada de mercadoria',
              note: SUPPLIERS_MOCK.find((s) => s.id === entry.supplierId)?.tradeName,
              reference: `NF ${entry.invoice}`,
              link: ['/admin/estoque/entradas', entry.id],
            });
          }
        }
        events.sort((a, b) => a.at.getTime() - b.at.getTime());
        // Saldo inicial = o que precisa existir antes para fechar no saldo atual.
        const initial = Math.max(0, variant.stock - events.reduce((sum, e) => sum + e.quantity, 0));
        let balance = initial;
        moves.push({
          id: moves.length + 1,
          sku: variant.id,
          at: start,
          type: 'inicial',
          quantity: initial,
          balance,
          by: 'George',
          reason: 'Cadastro',
        });
        for (const event of events) {
          balance += event.quantity;
          moves.push({ ...event, id: moves.length + 1, sku: variant.id, balance });
        }
      }
    }
    return moves;
  }
}
