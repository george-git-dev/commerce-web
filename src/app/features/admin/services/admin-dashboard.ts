import { computed, inject, Injectable, signal } from '@angular/core';
import { Gender, Product } from '../../../core/models/product';
import { withHighlights } from '../../../core/utils/product-highlights';
import { hasDeal } from '../../../core/utils/product-pricing';
import { AdminOrderItem, PENDING_REVIEWS_MOCK } from '../data/admin-orders-mock';
import {
  cancelledOrders,
  compareFormats,
  formatLabel,
  formatOf,
  matchesFormat,
  CostOf,
  customRange,
  grossProfit,
  Grouping,
  yearlySeries,
  productSales,
  validOrders,
  customRangeProblem,
  dailySeries,
  DashboardPeriod,
  dayRange,
  monthlySeries,
  monthRange,
  filterOrders,
  kpis,
  parseDay,
  periodRange,
  revenueOf,
  salesByGroup,
  salesRows,
  unitsOf,
  statusCounts,
} from './admin-metrics';
import { AdminOrderStore } from './admin-order-store';
import { AdminProductStore } from './admin-product-store';
import { AdminPurchaseStore } from './admin-purchase-store';
import { AdminStockStore } from './admin-stock-store';

/** Produto com estoque e sem venda há este tanto de dias = parado. */
export const IDLE_DAYS = 30;

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
  private readonly stock = inject(AdminStockStore);
  private readonly costOf: CostOf = (sku) => this.stock.costBySku()[sku];
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

  /** Tabela/gráfico por dia até 62 dias; acima disso, por mês. */
  /** "Ver por" da tabela/gráfico de vendas; vale para qualquer período. */
  readonly grouping = signal<Grouping>('dia');

  // --- Filtros -------------------------------------------------------------
  readonly category = signal('');
  /** `lancamento`, `oferta`, `mais-vendido` ou `selo:<nome>` (Exclusivo…). */
  readonly highlight = signal('');
  readonly gender = signal<Gender | ''>('');
  readonly brand = signal('');
  readonly supplierId = signal<number | null>(null);
  /** `frasco`, `decant` (qualquer tamanho), `decant:5` ou categoria (`kit`, `hidratante`…). */
  readonly format = signal('');
  readonly hasFilters = computed(
    () =>
      !!(
        this.format() ||
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
    this.format.set('');
  }

  /** Formatos à venda hoje: Frasco, Decant (todos), cada tamanho, Kit, Hidratante, Body splash… */
  readonly formatOptions = computed(() => {
    const formats = new Set(
      this.products
        .products()
        .filter((p) => p.status === 'publicado')
        .flatMap((p) =>
          p.variants.map((v) =>
            formatOf({ category: p.category, kind: v.kind, volumeMl: v.volumeMl }),
          ),
        ),
    );
    const sorted = [...formats].sort(compareFormats);
    const decants = sorted.filter((f) => f.startsWith('decant:'));
    // Frasco, Decant (todos), cada tamanho e depois kit, hidratante, body splash…
    const option = (id: string) => ({ id, label: formatLabel(id) });
    return [
      ...sorted.filter((f) => f === 'frasco').map(option),
      ...(decants.length ? [{ id: 'decant', label: 'Decant (todos)' }] : []),
      ...decants.map(option),
      ...sorted.filter((f) => f !== 'frasco' && !f.startsWith('decant:')).map(option),
    ];
  });

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
    const format = this.format();
    const slugs = this.allowedSlugs();
    const matches =
      category || gender || format || slugs
        ? (item: AdminOrderItem) =>
            (!category || item.category === category) &&
            (!gender || item.gender === gender) &&
            matchesFormat(item, format) &&
            (!slugs || slugs.has(item.slug))
        : null;
    return filterOrders(this.store.orders(), matches);
  });

  /** Indicadores do período (sem comparação com período anterior — decidido pelo George). */
  readonly kpis = computed(() => {
    const { start, end } = this.range();
    const orders = this.orders();
    const valid = validOrders(orders, start, end);
    return {
      current: {
        ...kpis(orders, start, end),
        units: unitsOf(valid),
        profit: grossProfit(valid, this.costOf),
        cancelled: cancelledOrders(orders, start, end),
      },
    };
  });

  /**
   * Série da tabela/gráfico no "Ver por": por dia (no mínimo 7 dias, para
   * ainda mostrar tendência), por mês ou por ano.
   */
  private series(value: Parameters<typeof dailySeries>[3]) {
    const { start, end, days } = this.range();
    const grouping = this.grouping();
    if (grouping !== 'dia') {
      const series = grouping === 'ano' ? yearlySeries : monthlySeries;
      return series(this.orders(), start, end, value);
    }
    return dailySeries(this.orders(), end, Math.max(7, days), value);
  }

  readonly salesSeries = computed(() => this.series(revenueOf));

  /** Tabela de vendas: uma linha por dia, mês ou ano (mesma janela do gráfico). */
  readonly salesRows = computed(() =>
    salesRows({
      revenue: this.series(revenueOf),
      orders: this.series((orders) => orders.length),
      units: this.series(unitsOf),
      newCustomers: this.series((orders) => orders.filter((o) => o.firstPurchase).length),
    }),
  );

  /** Vendas por produto, com marca, lucro bruto e margem (sem custo = `null`). */
  readonly productSales = computed(() => {
    const { start, end } = this.range();
    const brands = new Map(this.products.products().map((p) => [p.slug, p.brandName]));
    return productSales(this.orders(), start, end, this.costOf).map((product) => {
      const profit = product.cost == null ? null : product.revenue - product.cost;
      return {
        ...product,
        brand: brands.get(product.slug) ?? '',
        profit: profit == null ? null : Math.round(profit * 100) / 100,
        margin:
          profit == null || !product.revenue
            ? null
            : Math.round((profit / product.revenue) * 1000) / 10,
      };
    });
  });

  /**
   * Resumo do estoque de hoje (não depende do período nem dos filtros):
   * esgotados e baixos por variante, unidades e valor a custo, e produtos
   * à venda com estoque que não vendem há {@link IDLE_DAYS} dias.
   */
  readonly stockSummary = computed(() => {
    const rows = this.stock.rows();
    const since = new Date(this.now.getTime() - IDLE_DAYS * 86_400_000);
    const sold = new Set(
      this.store
        .orders()
        .filter((order) => order.status !== 'cancelado' && order.createdAt >= since)
        .flatMap((order) => order.items.map((item) => item.slug)),
    );
    const onSale = rows.filter((row) => row.product.status === 'publicado');
    const idle = new Set(
      onSale
        .filter((row) => row.variant.stock > 0 && !sold.has(row.product.slug))
        .map((row) => row.product.slug),
    );
    return {
      units: rows.reduce((sum, row) => sum + row.variant.stock, 0),
      value:
        Math.round(rows.reduce((sum, row) => sum + row.variant.stock * (row.cost ?? 0), 0) * 100) /
        100,
      uncosted: rows.filter((row) => row.variant.stock > 0 && row.cost == null).length,
      low: rows.filter((row) => row.status === 'baixo').length,
      out: rows.filter((row) => row.status === 'zerado').length,
      idle: idle.size,
    };
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
