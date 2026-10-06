import { computed, inject, Injectable, signal } from '@angular/core';
import { MOCK_PRODUCTS } from '../../../core/data/mock-products';
import { LOW_STOCK_THRESHOLD, PENDING_REVIEWS_MOCK } from '../data/admin-orders-mock';
import { AdminOrderStore } from './admin-order-store';
import {
  dailySeries,
  DashboardPeriod,
  delta,
  kpis,
  periodRange,
  revenueOf,
  salesByGroup,
  statusCounts,
  topProducts,
} from './admin-metrics';

/**
 * Números do painel. Hoje calculados no front a partir de pedidos fictícios;
 * na Fase 2 viram `GET /admin/dashboard?periodo=` (o back agrega no banco).
 */
@Injectable({ providedIn: 'root' })
export class AdminDashboard {
  private readonly store = inject(AdminOrderStore);
  private readonly now = this.store.now;
  /** Pedidos da loja (mudam quando a equipe avança ou cancela um pedido). */
  private get orders() {
    return this.store.orders();
  }

  readonly period = signal<DashboardPeriod>('30d');
  private readonly range = computed(() => periodRange(this.period(), this.now));

  readonly kpis = computed(() => {
    const { start, end, previousStart, previousEnd } = this.range();
    const current = kpis(this.orders, start, end);
    const previous = kpis(this.orders, previousStart, previousEnd);
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

  readonly salesSeries = computed(() =>
    dailySeries(this.orders, this.now, this.chartDays(), revenueOf),
  );

  /** Mini gráficos dos cards (mesma janela do gráfico principal). */
  readonly sparks = computed(() => {
    const days = this.chartDays();
    const series = (value: Parameters<typeof dailySeries>[3]) =>
      dailySeries(this.orders, this.now, days, value).map((point) => point.value);
    return {
      revenue: series(revenueOf),
      orders: series((orders) => orders.length),
      averageTicket: series((orders) => (orders.length ? revenueOf(orders) / orders.length : 0)),
      newCustomers: series((orders) => orders.filter((order) => order.firstPurchase).length),
    };
  });

  readonly topProducts = computed(() => {
    const { start, end } = this.range();
    return topProducts(this.orders, start, end);
  });

  readonly statusCounts = computed(() => {
    const { start, end } = this.range();
    return statusCounts(this.orders, start, end);
  });

  readonly salesByGroup = computed(() => {
    const { start, end } = this.range();
    return salesByGroup(this.orders, start, end);
  });

  /** Pendências que pedem ação, independentes do período escolhido. */
  readonly alerts = computed(() => ({
    toSeparate: this.orders.filter((order) => order.status === 'pago').length,
    inHandsPending: this.orders.filter(
      (order) =>
        order.shipping === 'em-maos' && ['pago', 'em-separacao', 'enviado'].includes(order.status),
    ).length,
    lowStock: MOCK_PRODUCTS.flatMap((product) => product.variants).filter(
      (variant) => variant.stock <= LOW_STOCK_THRESHOLD,
    ).length,
    pendingReviews: PENDING_REVIEWS_MOCK,
  }));

  /** Contador do menu "Aprovações". */
  readonly pendingApprovals = computed(
    () => this.alerts().pendingReviews + this.alerts().inHandsPending,
  );

  readonly latestOrders = computed(() => this.orders.slice(0, 5));
}
