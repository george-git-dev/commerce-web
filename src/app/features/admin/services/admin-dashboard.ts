import { computed, inject, Injectable, signal } from '@angular/core';
import { Gender, Product } from '../../../core/models/product';
import { withHighlights } from '../../../core/utils/product-highlights';
import { hasDeal } from '../../../core/utils/product-pricing';
import { PENDING_REVIEWS_MOCK } from '../data/admin-orders-mock';
import {
  customRange,
  customRangeProblem,
  dailySeries,
  DashboardPeriod,
  dayRange,
  MAX_DAILY_POINTS,
  monthlySeries,
  monthRange,
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
 * na Fase 2 viram `GET /admin/dashboard?de=&ate=&categoria=&destaque=&genero=&marca=&fornecedor=`
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
  /** Mês escolhido (`aaaa-mm`); começa no atual. */
  readonly month = signal(this.today.slice(0, 7));
  /** Personalizado: começa nos últimos 30 dias para não abrir vazio. */
  readonly customFrom = signal(isoDay(new Date(this.now.getTime() - 29 * 86_400_000)));
  readonly customTo = signal(this.today);

  /** Data inválida/futura na visão escolhida (`null` = ok). */
  readonly periodProblem = computed(() => {
    switch (this.period()) {
      case 'mes':
        if (!monthRange(this.month(), this.now)) return 'Escolha o mês.';
        return this.month() > this.today.slice(0, 7) ? 'O mês não pode ser no futuro.' : null;
      case 'personalizado':
        return customRangeProblem(this.customFrom(), this.customTo(), this.today);
      default:
        return null;
    }
  });

  readonly range = computed(() => {
    const period = this.period();
    // Data inválida: mostra os últimos 30 dias até corrigir.
    if (this.periodProblem()) return periodRange('30d', this.now);
    switch (period) {
      case 'hoje':
        return dayRange(this.now, this.now);
      case 'mes':
        return monthRange(this.month(), this.now)!;
      case 'personalizado':
        return customRange(parseDay(this.customFrom())!, parseDay(this.customTo())!);
      default:
        return periodRange(period, this.now);
    }
  });

  /** Gráfico por dia até 62 dias; acima disso, por mês. */
  readonly grouping = computed<'dia' | 'mes'>(() =>
    this.range().days > MAX_DAILY_POINTS ? 'mes' : 'dia',
  );

  // --- Filtros -------------------------------------------------------------
  readonly category = signal('');
  /** `lancamento`, `oferta`, `mais-vendido` ou `selo:<nome>` (Exclusivo…). */
  readonly highlight = signal('');
  readonly gender = signal<Gender | ''>('');
  readonly brand = signal('');
  readonly supplierId = signal<number | null>(null);
  readonly hasFilters = computed(
    () =>
      !!(
        this.category() ||
        this.highlight() ||
        this.gender() ||
        this.brand() ||
        this.supplierId() != null
      ),
  );

  clearFilters(): void {
    this.category.set('');
    this.highlight.set('');
    this.gender.set('');
    this.brand.set('');
    this.supplierId.set(null);
  }

  /** Produtos com Lançamento/Mais vendido calculados (situação de hoje). */
  private readonly catalog = computed(() => withHighlights(this.products.products()));

  /** Destaques que existem hoje no catálogo, para o filtro. */
  readonly highlightOptions = computed(() => {
    const badges = [...new Set(this.catalog().flatMap((p) => (p.badge ? [p.badge] : [])))].sort(
      (a, b) => a.localeCompare(b, 'pt-BR'),
    );
    return [
      { id: 'lancamento', label: 'Lançamentos' },
      { id: 'oferta', label: 'Ofertas' },
      { id: 'mais-vendido', label: 'Mais vendidos' },
      ...badges.map((badge) => ({ id: `selo:${badge}`, label: badge })),
    ];
  });

  /** Produtos (por slug) que passam nos filtros de destaque, marca e fornecedor. */
  private readonly allowedSlugs = computed(() => {
    const highlight = this.highlight();
    const brand = this.brand();
    const supplierId = this.supplierId();
    if (!highlight && !brand && supplierId == null) return null;
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
    const isHighlight = (p: Product) => {
      if (!highlight) return true;
      if (highlight === 'lancamento') return !!p.launch;
      if (highlight === 'oferta') return hasDeal(p);
      if (highlight === 'mais-vendido') return !!p.bestSeller;
      return p.badge === highlight.replace(/^selo:/, '');
    };
    return new Set(
      this.catalog()
        .filter(
          (p) =>
            isHighlight(p) &&
            (!brand || p.brandName === brand) &&
            (!supplied || p.variants.some((v) => supplied.has(v.id))),
        )
        .map((p) => p.slug),
    );
  });

  /** Pedidos da loja já filtrados (mudam quando a equipe avança ou cancela um pedido). */
  private readonly orders = computed(() => {
    const category = this.category();
    const gender = this.gender();
    const slugs = this.allowedSlugs();
    const matches =
      category || gender || slugs
        ? (item: { slug: string; category: string; gender: string }) =>
            (!category || item.category === category) &&
            (!gender || item.gender === gender) &&
            (!slugs || slugs.has(item.slug))
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

  /**
   * Série do gráfico na visão escolhida: por dia (no mínimo 7 dias, para
   * "Dia" ainda mostrar tendência) ou por mês em períodos longos.
   */
  private series(value: Parameters<typeof dailySeries>[3]) {
    const { start, end, days } = this.range();
    return this.grouping() === 'mes'
      ? monthlySeries(this.orders(), start, end, value)
      : dailySeries(this.orders(), end, Math.max(7, days), value);
  }

  readonly salesSeries = computed(() => this.series(revenueOf));

  /** Mini gráficos dos cards (mesma janela do gráfico principal). */
  readonly sparks = computed(() => {
    const series = (value: Parameters<typeof dailySeries>[3]) =>
      this.series(value).map((point) => point.value);
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
}
