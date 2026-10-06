import { OrderStatus } from '../../../core/models/order';
import { AdminOrder } from '../data/admin-orders-mock';

export type DashboardPeriod = 'hoje' | '7d' | '30d' | 'mes';

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  hoje: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  mes: 'Mês atual',
};

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

export function periodRange(period: DashboardPeriod, now: Date): DateRange {
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

/** Variação % contra o período anterior; `null` quando não há base para comparar. */
export function delta(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Série diária (rótulo dd/MM + valor) dos últimos `days` dias até `now`. */
export function dailySeries(
  orders: readonly AdminOrder[],
  now: Date,
  days: number,
  value: (orders: readonly AdminOrder[]) => number,
): { label: string; value: number }[] {
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(today.getTime() - (days - 1 - index) * DAY);
    const next = new Date(day.getTime() + DAY - 1);
    const label = day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return {
      label,
      value: value(orders.filter((order) => counts(order) && within(order, day, next))),
    };
  });
}

export const revenueOf = (orders: readonly AdminOrder[]) =>
  Math.round(orders.reduce((sum, order) => sum + order.total, 0) * 100) / 100;

export interface TopProduct {
  slug: string;
  name: string;
  image: string;
  units: number;
}

export function topProducts(
  orders: readonly AdminOrder[],
  from: Date,
  to: Date,
  limit = 5,
): TopProduct[] {
  const units = new Map<string, TopProduct>();
  for (const order of orders) {
    if (!counts(order) || !within(order, from, to)) continue;
    for (const item of order.items) {
      const current = units.get(item.slug) ?? {
        slug: item.slug,
        name: item.name,
        image: item.image,
        units: 0,
      };
      units.set(item.slug, { ...current, units: current.units + item.quantity });
    }
  }
  return [...units.values()]
    .sort((a, b) => b.units - a.units || a.name.localeCompare(b.name))
    .slice(0, limit);
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
