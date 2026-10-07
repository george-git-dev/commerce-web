import { OrderStatus } from '../../../core/models/order';
import { AdminOrder } from '../data/admin-orders-mock';

/** Atalhos relativos a hoje (usados pelo painel e pelos testes). */
export type QuickPeriod = 'hoje' | '7d' | '30d' | 'mes';

/** Visões do painel: um dia, 7 ou 30 dias, um mês ou de/até. */
export type DashboardPeriod = 'dia' | '7d' | '30d' | 'mes' | 'personalizado';

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  dia: 'Dia',
  '7d': '7 dias',
  '30d': '30 dias',
  mes: 'Mês',
  personalizado: 'Personalizado',
};

/** Acima disto o gráfico agrupa por mês (por dia ficaria ilegível). */
export const MAX_DAILY_POINTS = 62;

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
export function customRangeProblem(from: string, to: string, today: string): string | null {
  if (!parseDay(from) || !parseDay(to)) return 'Escolha as duas datas.';
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

/** Variação % contra o período anterior; `null` quando não há base para comparar. */
export function delta(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Série diária (rótulo dd/MM + valor) dos `days` dias que terminam em `last`. */
export function dailySeries(
  orders: readonly AdminOrder[],
  last: Date,
  days: number,
  value: (orders: readonly AdminOrder[]) => number,
): { label: string; value: number }[] {
  const today = startOfDay(last);
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
