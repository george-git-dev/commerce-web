import { computed, inject, Injectable, signal } from '@angular/core';
import { Occasion } from '../../../core/models/product';
import { PENDING_REVIEWS_MOCK } from '../data/admin-orders-mock';
import {
  customRange,
  customRangeProblem,
  dailySeries,
  DashboardPeriod,
  delta,
  filterOrders,
  kpis,
  parseDay,
  periodRange,
  revenueOf,
  salesByGroup,
  statusCounts,
  topProducts,
} from './admin-metrics';
import { AdminOrderStore } from './admin-order-store';
import { AdminProductStore } from './admin-product-store';
import { AdminPurchaseStore } from './admin-purchase-store';

/** `aaaa-mm-dd` no fuso local. */
function isoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Números do painel. Hoje calculados no front a partir de pedidos fictícios;
 * na Fase 2 viram `GET /admin/dashboard?de=&ate=&categoria=&ocasiao=&marca=&fornecedor=`
 * (o back agrega no banco).
 */
@Injectable({ providedIn: 'root' })
export class AdminDashboard {
  private readonly store = inject(AdminOrderStore);
  private readonly products = inject(AdminProductStore);
  private readonly purchases = inject(AdminPurchaseStore);
  private readonly now = this.store.now;
  readonly today = isoDay(this.now);

  // --- Período -------------------------------------------------------------
  readonly period = signal<DashboardPeriod>('30d');
  /** Personalizado: começa nos últimos 30 dias para não abrir vazio. */
  readonly customFrom = signal(isoDay(new Date(this.now.getTime() - 29 * 86_400_000)));
  readonly customTo = signal(this.today);
  readonly customProblem = computed(() =>
    this.period() === 'personalizado'
      ? customRangeProblem(this.customFrom(), this.customTo(), this.today)
      : null,
  );
  readonly range = computed(() => {
    const period = this.period();
    if (period !== 'personalizado') return periodRange(period, this.now);
    // Datas inválidas: mantém o último período válido visível (30 dias).
    if (this.customProblem()) return periodRange('30d', this.now);
    return customRange(parseDay(this.customFrom())!, parseDay(this.customTo())!);
  });

  // --- Filtros -------------------------------------------------------------
  readonly category = signal('');
  readonly occasion = signal<Occasion | ''>('');
  readonly brand = signal('');
  readonly supplierId = signal<number | null>(null);
  readonly hasFilters = computed(
    () => !!(this.category() || this.occasion() || this.brand() || this.supplierId() != null),
  );

  clearFilters(): void {
    this.category.set('');
    this.occasion.set('');
    this.brand.set('');
    this.supplierId.set(null);
  }

  /** Produtos (por slug) que passam nos filtros de marca, ocasião e fornecedor. */
  private readonly allowedSlugs = computed(() => {
    const brand = this.brand();
    const occasion = this.occasion();
    const supplierId = this.supplierId();
    if (!brand && !occasion && supplierId == null) return null;
    // Fornecedor = produtos que ele já entregou (entradas recebidas).
    const supplied =
      supplierId == null
        ? null
        : new Set(
            this.purchases
              .entriesOf(supplierId)
              .filter((entry) => entry.status === 'recebido')
              .flatMap((entry) => entry.items.map((item) => item.sku)),
          );
    return new Set(
      this.products
        .products()
        .filter(
          (p) =>
            (!brand || p.brandName === brand) &&
            (!occasion || !!p.occasions?.includes(occasion)) &&
            (!supplied || p.variants.some((v) => supplied.has(v.id))),
        )
        .map((p) => p.slug),
    );
  });

  /** Pedidos da loja já filtrados (mudam quando a equipe avança ou cancela um pedido). */
  private readonly orders = computed(() => {
    const category = this.category();
    const slugs = this.allowedSlugs();
    const matches =
      category || slugs
        ? (item: { slug: string; category: string }) =>
            (!category || item.category === category) && (!slugs || slugs.has(item.slug))
        : null;
    return filterOrders(this.store.orders(), matches);
  });

  readonly kpis = computed(() => {
    const { start, end, previousStart, previousEnd } = this.range();
    const current = kpis(this.orders(), start, end);
    const previous = kpis(this.orders(), previousStart, previousEnd);
    return {
      current,
      delta: {
        revenue: delta(current.revenue, previous.revenue),
        orders: delta(current.orders, previous.orders),
        averageTicket: delta(current.averageTicket, previous.averageTicket),
        newCustomers: delta(current.newCustomers, previous.newCustomers),
      },
    };
  });

  /** Dias do gráfico: no mínimo 7, para "Hoje" ainda mostrar tendência. */
  private readonly chartDays = computed(() => Math.max(7, this.range().days));
  /** Último dia do gráfico: hoje, ou o "até" do personalizado. */
  private readonly lastDay = computed(() =>
    this.range().end < this.now ? this.range().end : this.now,
  );

  readonly salesSeries = computed(() =>
    dailySeries(this.orders(), this.lastDay(), this.chartDays(), revenueOf),
  );

  /** Mini gráficos dos cards (mesma janela do gráfico principal). */
  readonly sparks = computed(() => {
    const days = this.chartDays();
    const series = (value: Parameters<typeof dailySeries>[3]) =>
      dailySeries(this.orders(), this.lastDay(), days, value).map((point) => point.value);
    return {
      revenue: series(revenueOf),
      orders: series((orders) => orders.length),
      averageTicket: series((orders) => (orders.length ? revenueOf(orders) / orders.length : 0)),
      newCustomers: series((orders) => orders.filter((order) => order.firstPurchase).length),
    };
  });

  readonly topProducts = computed(() => {
    const { start, end } = this.range();
    return topProducts(this.orders(), start, end);
  });

  readonly statusCounts = computed(() => {
    const { start, end } = this.range();
    return statusCounts(this.orders(), start, end);
  });

  readonly salesByGroup = computed(() => {
    const { start, end } = this.range();
    return salesByGroup(this.orders(), start, end);
  });

  /** Contador do menu "Aprovações" (avaliações + entregas em mãos em aberto). */
  readonly pendingApprovals = computed(
    () =>
      PENDING_REVIEWS_MOCK +
      this.store
        .orders()
        .filter(
          (order) =>
            order.shipping === 'em-maos' &&
            ['pago', 'em-separacao', 'enviado'].includes(order.status),
        ).length,
  );

  /** Últimos pedidos que têm algo do filtro (com o total real do pedido). */
  readonly latestOrders = computed(() => {
    const numbers = new Set(this.orders().map((order) => order.number));
    return this.store
      .orders()
      .filter((order) => numbers.has(order.number))
      .slice(0, 5);
  });
}
