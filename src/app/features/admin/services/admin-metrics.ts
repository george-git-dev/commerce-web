import { categoryInfo, PRODUCT_CATEGORIES } from '../../../core/config/product-categories';
import { OrderStatus } from '../../../core/models/order';
import { AdminOrder } from '../data/admin-orders-mock';

/** Atalhos relativos a hoje (usados pelo painel e pelos testes). */
export type QuickPeriod = 'hoje' | '7d' | '30d' | 'mes';

/** Visões do painel: hoje, últimos 7 ou 30 dias, um mês ou de/até (um dia só = de e até iguais). */
export type DashboardPeriod = 'hoje' | '7d' | '30d' | 'mes' | 'personalizado';

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  hoje: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  mes: 'Mês',
  personalizado: 'Personalizado',
};

/** Como a tabela/gráfico de vendas agrupa as linhas ("Ver por"). */
export type Grouping = 'dia' | 'mes' | 'ano';

export const GROUPING_LABELS: Record<Grouping, string> = { dia: 'Dia', mes: 'Mês', ano: 'Ano' };

export interface DateRange {
  start: Date;
  end: Date;
  /** Período anterior de mesmo tamanho (para a variação %). */
  previousStart: Date;
  previousEnd: Date;
  days: number;
}

const DAY = 86_400_000;

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** `aaaa-mm-dd` (campo de data) → início do dia, no fuso local. */
export function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Um dia inteiro (até agora, se for hoje), comparado com o dia anterior. */
export function dayRange(day: Date, now: Date): DateRange {
  const start = startOfDay(day);
  const fullEnd = new Date(start.getTime() + DAY - 1);
  const end = fullEnd > now ? new Date(now) : fullEnd;
  return {
    start,
    end,
    previousStart: new Date(start.getTime() - DAY),
    previousEnd: new Date(start.getTime() - 1),
    days: 1,
  };
}

/**
 * Um mês (`aaaa-mm`; o atual vai até hoje), comparado com os mesmos dias do
 * mês anterior — 1º a 7 de outubro contra 1º a 7 de setembro.
 */
export function monthRange(month: string, now: Date): DateRange | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const index = Number(match[2]) - 1;
  const start = new Date(year, index, 1);
  const fullEnd = new Date(new Date(year, index + 1, 1).getTime() - 1);
  const end = fullEnd > now ? new Date(now) : fullEnd;
  const days = Math.round((startOfDay(end).getTime() - start.getTime()) / DAY) + 1;
  const previousStart = new Date(year, index - 1, 1);
  const previousMonthEnd = new Date(start.getTime() - 1);
  const shifted = new Date(previousStart.getTime() + days * DAY - 1);
  const previousEnd = shifted < previousMonthEnd ? shifted : previousMonthEnd;
  return { start, end, previousStart, previousEnd, days };
}

/** Problema do período personalizado (`null` = válido). `today` = `aaaa-mm-dd`. */
/**
 * Data mais antiga aceita no período personalizado. Também evita que, ao
 * digitar o ano ("0002", "0020"…), o painel tente calcular séculos de dias.
 */
export const MIN_DAY = '2020-01-01';

export function customRangeProblem(from: string, to: string, today: string): string | null {
  if (!parseDay(from) || !parseDay(to)) return 'Escolha as duas datas.';
  if (from < MIN_DAY || to < MIN_DAY) return 'Use datas a partir de 2020.';
  if (from > to) return 'A data inicial precisa ser antes da final.';
  if (to > today) return 'A data final não pode ser no futuro.';
  return null;
}

/** Período escolhido de/até (dias inteiros), com o anterior de mesmo tamanho. */
export function customRange(from: Date, to: Date): DateRange {
  const start = startOfDay(from);
  const end = new Date(startOfDay(to).getTime() + DAY - 1);
  const days = Math.round((startOfDay(to).getTime() - start.getTime()) / DAY) + 1;
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(start.getTime() - days * DAY);
  return { start, end, previousStart, previousEnd, days };
}

export function periodRange(period: QuickPeriod, now: Date): DateRange {
  const end = new Date(now);
  const today = startOfDay(now);
  const start =
    period === 'mes'
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : new Date(today.getTime() - ((period === 'hoje' ? 1 : period === '7d' ? 7 : 30) - 1) * DAY);
  const days = Math.round((today.getTime() - start.getTime()) / DAY) + 1;
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(start.getTime() - days * DAY);
  return { start, end, previousStart, previousEnd, days };
}

const counts = (order: AdminOrder) => order.status !== 'cancelado';
const within = (order: AdminOrder, from: Date, to: Date) =>
  order.createdAt >= from && order.createdAt <= to;

export interface Kpis {
  revenue: number;
  orders: number;
  averageTicket: number;
  newCustomers: number;
}

export function kpis(orders: readonly AdminOrder[], from: Date, to: Date): Kpis {
  const valid = orders.filter((order) => counts(order) && within(order, from, to));
  const revenue = valid.reduce((sum, order) => sum + order.total, 0);
  return {
    revenue: Math.round(revenue * 100) / 100,
    orders: valid.length,
    averageTicket: valid.length ? Math.round((revenue / valid.length) * 100) / 100 : 0,
    newCustomers: valid.filter((order) => order.firstPurchase).length,
  };
}

/** Série diária (rótulo dd/MM + valor) dos `days` dias que terminam em `last`. */
export function dailySeries(
  orders: readonly AdminOrder[],
  last: Date,
  days: number,
  value: (orders: readonly AdminOrder[]) => number,
): { label: string; value: number }[] {
  const today = startOfDay(last);
  const first = new Date(today);
  first.setDate(today.getDate() - (days - 1));
  const end = new Date(today.getTime() + DAY - 1);
  // Agrupa os pedidos por dia uma vez só (não filtra a lista inteira a cada dia).
  const key = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const byDay = new Map<string, AdminOrder[]>();
  for (const order of orders) {
    if (!counts(order) || !within(order, first, end)) continue;
    const k = key(order.createdAt);
    const list = byDay.get(k);
    if (list) list.push(order);
    else byDay.set(k, [order]);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(first);
    day.setDate(first.getDate() + index);
    return {
      label: `${pad(day.getDate())}/${pad(day.getMonth() + 1)}`,
      value: value(byDay.get(key(day)) ?? []),
    };
  });
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Série por mês (rótulo "set/26"), de `start` a `end`. */
export function monthlySeries(
  orders: readonly AdminOrder[],
  start: Date,
  end: Date,
  value: (orders: readonly AdminOrder[]) => number,
): { label: string; value: number }[] {
  const points: { label: string; value: number }[] = [];
  let month = new Date(start.getFullYear(), start.getMonth(), 1);
  while (month <= end) {
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const from = month < start ? start : month;
    const to = new Date(Math.min(next.getTime() - 1, end.getTime()));
    points.push({
      label: `${MONTHS[month.getMonth()]}/${String(month.getFullYear()).slice(2)}`,
      value: value(orders.filter((order) => counts(order) && within(order, from, to))),
    });
    month = next;
  }
  return points;
}

/** Série por ano (rótulo "2026"), de `start` a `end`; anos cortados contam só os dias de dentro. */
export function yearlySeries(
  orders: readonly AdminOrder[],
  start: Date,
  end: Date,
  value: (orders: readonly AdminOrder[]) => number,
): { label: string; value: number }[] {
  const points: { label: string; value: number }[] = [];
  for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
    const first = new Date(year, 0, 1);
    const from = first < start ? start : first;
    const to = new Date(Math.min(new Date(year + 1, 0, 1).getTime() - 1, end.getTime()));
    points.push({
      label: String(year),
      value: value(orders.filter((order) => counts(order) && within(order, from, to))),
    });
  }
  return points;
}

/** Unidades vendidas (soma das quantidades dos itens). */
export const unitsOf = (orders: readonly AdminOrder[]) =>
  orders.reduce((sum, order) => sum + order.items.reduce((s, i) => s + i.quantity, 0), 0);

/** Uma linha da tabela de vendas (um dia ou um mês). */
export interface SalesRow {
  label: string;
  orders: number;
  units: number;
  revenue: number;
  averageTicket: number;
  newCustomers: number;
}

/** Junta as séries (mesmos rótulos, mesma ordem) numa linha por dia/mês. */
export function salesRows(series: {
  revenue: readonly { label: string; value: number }[];
  orders: readonly { value: number }[];
  units: readonly { value: number }[];
  newCustomers: readonly { value: number }[];
}): SalesRow[] {
  return series.revenue.map((point, i) => {
    const orders = series.orders[i]?.value ?? 0;
    return {
      label: point.label,
      orders,
      units: series.units[i]?.value ?? 0,
      revenue: point.value,
      averageTicket: orders ? Math.round((point.value / orders) * 100) / 100 : 0,
      newCustomers: series.newCustomers[i]?.value ?? 0,
    };
  });
}

/** Linha de total: soma tudo; ticket médio = faturamento ÷ pedidos. */
export function totalRow(rows: readonly SalesRow[]): SalesRow {
  const sum = (key: 'orders' | 'units' | 'revenue' | 'newCustomers') =>
    rows.reduce((total, row) => total + row[key], 0);
  const revenue = Math.round(sum('revenue') * 100) / 100;
  const orders = sum('orders');
  return {
    label: 'Total',
    orders,
    units: sum('units'),
    revenue,
    averageTicket: orders ? Math.round((revenue / orders) * 100) / 100 : 0,
    newCustomers: sum('newCustomers'),
  };
}

export const revenueOf = (orders: readonly AdminOrder[]) =>
  Math.round(orders.reduce((sum, order) => sum + order.total, 0) * 100) / 100;

type Item = AdminOrder['items'][number];

/**
 * Pedidos só com os itens que passam no filtro (categoria, marca…). Pedido
 * sem nenhum item do filtro sai; o total vira a soma desses itens (sem frete),
 * para faturamento e ticket médio falarem só do que foi filtrado.
 */
export function filterOrders(
  orders: readonly AdminOrder[],
  matches: ((item: Item) => boolean) | null,
): readonly AdminOrder[] {
  if (!matches) return orders;
  return orders.flatMap((order) => {
    const items = order.items.filter(matches);
    if (!items.length) return [];
    const total =
      Math.round(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) * 100) / 100;
    return [{ ...order, items, subtotal: total, shippingPrice: 0, total }];
  });
}

/** Custo médio de um SKU (das entradas de mercadoria); `undefined` = sem compra registrada. */
export type CostOf = (sku: string) => number | undefined;

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Pedidos válidos (não cancelados) do período. */
export function validOrders(orders: readonly AdminOrder[], from: Date, to: Date) {
  return orders.filter((order) => counts(order) && within(order, from, to));
}

export interface GrossProfit {
  /** Preço − custo médio, só dos itens com custo conhecido (frete fora). */
  profit: number;
  /** Lucro ÷ venda desses itens, em %; `null` sem item com custo. */
  margin: number | null;
  /** SKUs vendidos sem custo registrado (o lucro fica parcial). */
  uncosted: number;
}

/**
 * Lucro bruto: o que sobra do preço de venda depois do custo do produto.
 * Não é lucro líquido (taxas de pagamento, impostos e frete ficam de fora).
 */
export function grossProfit(orders: readonly AdminOrder[], costOf: CostOf): GrossProfit {
  let revenue = 0;
  let cost = 0;
  const missing = new Set<string>();
  for (const order of orders) {
    for (const item of order.items) {
      const unitCost = costOf(item.sku);
      if (unitCost == null) {
        missing.add(item.sku);
        continue;
      }
      revenue += item.unitPrice * item.quantity;
      cost += unitCost * item.quantity;
    }
  }
  const profit = round2(revenue - cost);
  return {
    profit,
    margin: revenue ? Math.round((profit / revenue) * 1000) / 10 : null,
    uncosted: missing.size,
  };
}

/** Quantos pedidos criados no período foram cancelados. */
export function cancelledOrders(orders: readonly AdminOrder[], from: Date, to: Date): number {
  return orders.filter((order) => order.status === 'cancelado' && within(order, from, to)).length;
}

// --- Formato: frasco, kit ou decant de N ml ---------------------------------

/**
 * `frasco` (perfume lacrado), `decant:5` (decant de 5 ml) ou, fora de
 * perfume, a própria categoria: `kit`, `hidratante`, `body-splash`…
 */
export type SaleFormat = string;

export function formatOf(item: Pick<Item, 'category' | 'kind' | 'volumeMl'>): SaleFormat {
  if (item.kind === 'decant') return `decant:${item.volumeMl ?? 0}`;
  return item.category === 'perfume' ? 'frasco' : item.category;
}

export function formatLabel(format: SaleFormat): string {
  if (format === 'frasco') return 'Frasco';
  if (format.startsWith('decant:')) return `Decant ${format.replace('decant:', '')} ml`;
  return categoryInfo(format).label;
}

/**
 * Ordem fixa: frasco, decants do menor para o maior e depois as outras
 * categorias na ordem do cadastro (kit, hidratante, body splash, novas).
 */
export function compareFormats(a: SaleFormat, b: SaleFormat): number {
  const rank = (f: SaleFormat) => {
    if (f === 'frasco') return -1_000_000;
    if (f.startsWith('decant:')) return -100_000 + Number(f.replace('decant:', ''));
    const index = PRODUCT_CATEGORIES.findIndex((category) => category.id === f);
    return index < 0 ? 1_000 : index;
  };
  return rank(a) - rank(b) || a.localeCompare(b);
}

/** O item passa no filtro de formato? `decant` = qualquer tamanho. */
export function matchesFormat(item: Item, filter: string): boolean {
  return formatMatches(formatOf(item), filter);
}

/** O formato passa no filtro? Vazio = todos; `decant` = qualquer tamanho. */
export function formatMatches(format: SaleFormat, filter: string): boolean {
  if (!filter) return true;
  return filter === 'decant' ? format.startsWith('decant:') : format === filter;
}

/** Uma linha do ranking: uma variante (Khamrah frasco ≠ Khamrah decant 5 ml). */
export interface ProductSales {
  sku: string;
  slug: string;
  name: string;
  /** "Frasco 100 ml", "Decant 5 ml", "Kit". */
  variant: string;
  /** `frasco`, `kit` ou `decant:5` (para filtrar o ranking). */
  format: SaleFormat;
  image: string;
  units: number;
  revenue: number;
  /** Custo total dos itens; `null` se algum foi vendido sem custo registrado. */
  cost: number | null;
}

/** Vendas por variante no período (maior faturamento primeiro). */
export function productSales(
  orders: readonly AdminOrder[],
  from: Date,
  to: Date,
  costOf: CostOf,
): ProductSales[] {
  const totals = new Map<string, ProductSales>();
  for (const order of validOrders(orders, from, to)) {
    for (const item of order.items) {
      const current = totals.get(item.sku) ?? {
        sku: item.sku,
        slug: item.slug,
        name: item.name,
        variant: item.variant,
        format: formatOf(item),
        image: item.image,
        units: 0,
        revenue: 0,
        cost: 0,
      };
      const unitCost = costOf(item.sku);
      totals.set(item.sku, {
        ...current,
        units: current.units + item.quantity,
        revenue: round2(current.revenue + item.unitPrice * item.quantity),
        cost:
          current.cost == null || unitCost == null
            ? null
            : round2(current.cost + unitCost * item.quantity),
      });
    }
  }
  return [...totals.values()].sort(
    (a, b) => b.revenue - a.revenue || b.units - a.units || a.name.localeCompare(b.name),
  );
}

/** Ordem fixa dos status no painel (a do fluxo do pedido, cancelado por último). */
export const STATUS_ORDER: readonly OrderStatus[] = [
  'aguardando-pagamento',
  'pago',
  'em-separacao',
  'enviado',
  'entregue',
  'cancelado',
];

export function statusCounts(orders: readonly AdminOrder[], from: Date, to: Date) {
  return STATUS_ORDER.map((status) => ({
    status,
    count: orders.filter((order) => order.status === status && within(order, from, to)).length,
  }));
}

/** Grupos de venda do painel: perfumes por gênero, kits e corpo e banho. */
export const SALES_GROUPS = [
  'Masculinos',
  'Femininos',
  'Unissex',
  'Kits',
  'Corpo e banho',
] as const;
export type SalesGroup = (typeof SALES_GROUPS)[number];

function groupOf(item: AdminOrder['items'][number]): SalesGroup {
  if (item.category === 'kit') return 'Kits';
  if (item.category !== 'perfume') return 'Corpo e banho';
  return item.gender === 'Masculino'
    ? 'Masculinos'
    : item.gender === 'Feminino'
      ? 'Femininos'
      : 'Unissex';
}

export function salesByGroup(orders: readonly AdminOrder[], from: Date, to: Date) {
  const totals = new Map<SalesGroup, number>(SALES_GROUPS.map((group) => [group, 0]));
  for (const order of orders) {
    if (!counts(order) || !within(order, from, to)) continue;
    for (const item of order.items) {
      const group = groupOf(item);
      totals.set(group, (totals.get(group) ?? 0) + item.unitPrice * item.quantity);
    }
  }
  return SALES_GROUPS.map((group) => ({
    group,
    value: Math.round((totals.get(group) ?? 0) * 100) / 100,
  }));
}
