import { netTotal } from './admin-order-flow';
import { PAYMENT_METHOD_LABELS } from '../../../core/models/order';
import { CsvValue, toCsv } from '../../../core/utils/csv';
import { variantLabel } from '../../../core/utils/product-pricing';
import { AdminOrder } from '../data/admin-orders-mock';
import { CostOf, customRange, DateRange, productSales, validOrders } from './admin-metrics';
import { StockRow } from './admin-stock-store';
import { AdminCustomer } from './customer-rules';
import { entryTotal, PurchaseEntry, Supplier } from './purchase-rules';
import { STOCK_STATUS_LABELS } from './stock-rules';

/**
 * Relatórios do backoffice em funções puras: cada um vira uma tabela (colunas
 * + linhas + totais) que a tela mostra e o CSV exporta igual. Fase 2:
 * `GET /admin/reports/{tipo}?from=&to=&group=` (consultas agregadas no back).
 */

export type ReportId = 'vendas' | 'produtos' | 'estoque' | 'compras' | 'pagamentos' | 'clientes';

export const REPORTS: Record<ReportId, { label: string; hint: string; usesPeriod: boolean }> = {
  vendas: {
    label: 'Vendas por período',
    hint: 'Pedidos, faturamento e frete por dia ou mês.',
    usesPeriod: true,
  },
  produtos: {
    label: 'Vendas por produto',
    hint: 'Quantidade, faturamento, custo e margem por SKU.',
    usesPeriod: true,
  },
  estoque: {
    label: 'Estoque valorizado',
    hint: 'Posição de hoje: saldo, custo médio e valor parado.',
    usesPeriod: false,
  },
  compras: {
    label: 'Compras por fornecedor',
    hint: 'Entradas de mercadoria por fornecedor ou por nota.',
    usesPeriod: true,
  },
  pagamentos: {
    label: 'Pagamento e entrega',
    hint: 'Como os clientes pagam e recebem.',
    usesPeriod: true,
  },
  clientes: {
    label: 'Clientes',
    hint: 'Quem mais comprou no período e novos × recorrentes.',
    usesPeriod: true,
  },
};

/** Agrupamento: vendas (dia/mês) e compras (fornecedor/nota). */
export const REPORT_GROUPS: Partial<Record<ReportId, readonly [string, string][]>> = {
  vendas: [
    ['dia', 'Por dia'],
    ['mes', 'Por mês'],
  ],
  compras: [
    ['fornecedor', 'Por fornecedor'],
    ['nota', 'Por nota fiscal'],
  ],
};

export type ReportPeriod = 'mes' | 'mes-passado' | '30' | '90' | 'ano' | 'personalizado';

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  mes: 'Este mês',
  'mes-passado': 'Mês passado',
  '30': 'Últimos 30 dias',
  '90': 'Últimos 90 dias',
  ano: 'Este ano',
  personalizado: 'Personalizado',
};

/** De/até do período (dias inteiros). `from`/`to` só no personalizado. */
export function reportRange(period: ReportPeriod, now: Date, from?: Date, to?: Date): DateRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case 'mes':
      return customRange(new Date(today.getFullYear(), today.getMonth(), 1), today);
    case 'mes-passado':
      return customRange(
        new Date(today.getFullYear(), today.getMonth() - 1, 1),
        new Date(today.getFullYear(), today.getMonth(), 0),
      );
    case '30':
    case '90':
      return customRange(new Date(today.getTime() - (Number(period) - 1) * 86_400_000), today);
    case 'ano':
      return customRange(new Date(today.getFullYear(), 0, 1), today);
    default:
      return customRange(from ?? today, to ?? today);
  }
}

// ----- Tabela genérica -----------------------------------------------------

export type CellKind = 'text' | 'int' | 'money' | 'pct' | 'date';
export type ReportValue = string | number | Date | null;

export interface ReportColumn {
  key: string;
  label: string;
  kind: CellKind;
}

export interface ReportRow {
  cells: Record<string, ReportValue>;
  /** Tela do item no backoffice (cliente, SKU, fornecedor…). */
  link?: string;
}

export interface ReportTable {
  columns: readonly ReportColumn[];
  rows: ReportRow[];
  /** Linha de totais (célula ausente = vazia). */
  totals?: Record<string, ReportValue>;
  /** Observação curta acima da tabela (ex.: novos × recorrentes). */
  note?: string;
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const pct = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : null;
/** "59,1%" (vírgula, como no resto da tela). */
const pctText = (part: number, whole: number) =>
  `${(pct(part, whole) ?? 0).toLocaleString('pt-BR')}%`;
const within = (date: Date, range: DateRange) => date >= range.start && date <= range.end;
const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthNames = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** 1. Vendas por dia ou mês (só períodos com pedido; cancelados à parte). */
export function salesReport(
  orders: readonly AdminOrder[],
  range: DateRange,
  group: 'dia' | 'mes',
): ReportTable {
  const buckets = new Map<
    string,
    {
      label: string;
      orders: number;
      items: number;
      revenue: number;
      freight: number;
      cancelled: number;
    }
  >();
  for (const order of orders) {
    if (!within(order.createdAt, range)) continue;
    const d = order.createdAt;
    const key = group === 'dia' ? dayKey(d) : `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const label =
      group === 'dia'
        ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
        : `${monthNames[d.getMonth()]}/${d.getFullYear()}`;
    const bucket = buckets.get(key) ?? {
      label,
      orders: 0,
      items: 0,
      revenue: 0,
      freight: 0,
      cancelled: 0,
    };
    if (order.status === 'cancelado') bucket.cancelled++;
    else {
      bucket.orders++;
      bucket.items += order.items.reduce((sum, item) => sum + item.quantity, 0);
      bucket.revenue += netTotal(order);
      bucket.freight += order.shippingPrice;
    }
    buckets.set(key, bucket);
  }
  const rows: ReportRow[] = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, b]) => ({
      cells: {
        periodo: b.label,
        _ordem: key,
        pedidos: b.orders,
        itens: b.items,
        faturamento: round2(b.revenue),
        frete: round2(b.freight),
        ticket: b.orders ? round2(b.revenue / b.orders) : null,
        cancelados: b.cancelled,
      },
    }));
  const sum = (key: string) => rows.reduce((total, row) => total + (row.cells[key] as number), 0);
  const totalOrders = sum('pedidos');
  return {
    columns: [
      { key: 'periodo', label: group === 'dia' ? 'Dia' : 'Mês', kind: 'text' },
      { key: 'pedidos', label: 'Pedidos', kind: 'int' },
      { key: 'itens', label: 'Itens', kind: 'int' },
      { key: 'faturamento', label: 'Faturamento', kind: 'money' },
      { key: 'frete', label: 'Frete', kind: 'money' },
      { key: 'ticket', label: 'Ticket médio', kind: 'money' },
      { key: 'cancelados', label: 'Cancelados', kind: 'int' },
    ],
    rows,
    totals: {
      periodo: 'Total',
      pedidos: totalOrders,
      itens: sum('itens'),
      faturamento: round2(sum('faturamento')),
      frete: round2(sum('frete')),
      ticket: totalOrders ? round2(sum('faturamento') / totalOrders) : null,
      cancelados: sum('cancelados'),
    },
    note: 'Faturamento com frete; pedidos cancelados ficam fora dos valores.',
  };
}

/** 2. Vendas por SKU, com custo médio e margem (lucro bruto). */
export function productsReport(
  orders: readonly AdminOrder[],
  range: DateRange,
  costOf: CostOf,
): ReportTable {
  const sales = productSales(orders, range.start, range.end, costOf);
  const rows: ReportRow[] = sales.map((s) => {
    const profit = s.cost == null ? null : round2(s.revenue - s.cost);
    return {
      link: `/admin/estoque/${s.sku}`,
      cells: {
        produto: s.name,
        formato: s.variant,
        sku: s.sku,
        quantidade: s.units,
        faturamento: s.revenue,
        custo: s.cost,
        lucro: profit,
        margem: profit == null ? null : pct(profit, s.revenue),
      },
    };
  });
  const costed = sales.filter((s) => s.cost != null);
  const revenue = round2(sales.reduce((sum, s) => sum + s.revenue, 0));
  const costedRevenue = costed.reduce((sum, s) => sum + s.revenue, 0);
  const cost = round2(costed.reduce((sum, s) => sum + (s.cost ?? 0), 0));
  const profit = round2(costedRevenue - cost);
  return {
    columns: [
      { key: 'produto', label: 'Produto', kind: 'text' },
      { key: 'formato', label: 'Formato', kind: 'text' },
      { key: 'sku', label: 'SKU', kind: 'text' },
      { key: 'quantidade', label: 'Qtd.', kind: 'int' },
      { key: 'faturamento', label: 'Faturamento', kind: 'money' },
      { key: 'custo', label: 'Custo', kind: 'money' },
      { key: 'lucro', label: 'Lucro bruto', kind: 'money' },
      { key: 'margem', label: 'Margem', kind: 'pct' },
    ],
    rows,
    totals: {
      produto: 'Total',
      quantidade: sales.reduce((sum, s) => sum + s.units, 0),
      faturamento: revenue,
      custo: cost,
      lucro: profit,
      margem: pct(profit, costedRevenue),
    },
    note: 'Sem frete. Lucro bruto = venda − custo médio de compra (impostos e taxas fora). SKU sem custo registrado fica sem lucro.',
  };
}

/** Última venda (não cancelada) de cada SKU. */
export function lastSaleBySku(orders: readonly AdminOrder[]): Map<string, Date> {
  const last = new Map<string, Date>();
  for (const order of orders) {
    if (order.status === 'cancelado') continue;
    for (const item of order.items) {
      const current = last.get(item.sku);
      if (!current || order.createdAt > current) last.set(item.sku, order.createdAt);
    }
  }
  return last;
}

/** 3. Estoque valorizado: posição de hoje (não usa período). */
export function stockReport(
  rows: readonly StockRow[],
  lastSale: ReadonlyMap<string, Date>,
  now: Date,
): ReportTable {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const table: ReportRow[] = rows.map((row) => {
    const value = row.cost == null ? null : round2(row.cost * row.variant.stock);
    const sold = lastSale.get(row.variant.id);
    return {
      link: `/admin/estoque/${row.variant.id}`,
      cells: {
        produto: row.product.name,
        formato: variantLabel(row.product, row.variant),
        sku: row.variant.id,
        saldo: row.variant.stock,
        custo: row.cost ?? null,
        valor: value,
        minimo: row.min,
        situacao: STOCK_STATUS_LABELS[row.status],
        semVenda: sold ? Math.max(0, Math.floor((today - sold.getTime()) / 86_400_000)) : null,
      },
    };
  });
  return {
    columns: [
      { key: 'produto', label: 'Produto', kind: 'text' },
      { key: 'formato', label: 'Formato', kind: 'text' },
      { key: 'sku', label: 'SKU', kind: 'text' },
      { key: 'saldo', label: 'Saldo', kind: 'int' },
      { key: 'custo', label: 'Custo médio', kind: 'money' },
      { key: 'valor', label: 'Valor em estoque', kind: 'money' },
      { key: 'minimo', label: 'Mínimo', kind: 'int' },
      { key: 'situacao', label: 'Situação', kind: 'text' },
      { key: 'semVenda', label: 'Dias sem venda', kind: 'int' },
    ],
    rows: table,
    totals: {
      produto: 'Total',
      saldo: rows.reduce((sum, row) => sum + row.variant.stock, 0),
      valor: round2(
        table.reduce((sum, row) => sum + ((row.cells['valor'] as number | null) ?? 0), 0),
      ),
    },
    note: 'Posição de hoje (o período não se aplica). Valor = saldo × custo médio; "Dias sem venda" vazio = nunca vendeu.',
  };
}

/** 4. Compras (entradas) no período, por fornecedor ou por nota. */
export function purchasesReport(
  entries: readonly PurchaseEntry[],
  suppliers: readonly Supplier[],
  range: DateRange,
  group: 'fornecedor' | 'nota',
): ReportTable {
  const name = (id: number) => {
    const s = suppliers.find((item) => item.id === id);
    return s ? s.tradeName || s.legalName : '—';
  };
  const inRange = entries.filter((entry) => within(entry.date, range));
  const units = (entry: PurchaseEntry) => entry.items.reduce((sum, item) => sum + item.quantity, 0);
  if (group === 'nota') {
    const rows: ReportRow[] = [...inRange]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((entry) => ({
        link: `/admin/estoque/entradas/${entry.id}`,
        cells: {
          data: entry.date,
          nota: entry.invoice,
          fornecedor: name(entry.supplierId),
          itens: units(entry),
          total: round2(entryTotal(entry.items)),
          situacao: entry.status === 'recebido' ? 'Recebido' : 'A receber',
        },
      }));
    return {
      columns: [
        { key: 'data', label: 'Data da nota', kind: 'date' },
        { key: 'nota', label: 'Nota fiscal', kind: 'text' },
        { key: 'fornecedor', label: 'Fornecedor', kind: 'text' },
        { key: 'itens', label: 'Itens', kind: 'int' },
        { key: 'total', label: 'Total', kind: 'money' },
        { key: 'situacao', label: 'Situação', kind: 'text' },
      ],
      rows,
      totals: {
        data: 'Total',
        itens: rows.reduce((sum, row) => sum + (row.cells['itens'] as number), 0),
        total: round2(rows.reduce((sum, row) => sum + (row.cells['total'] as number), 0)),
      },
    };
  }
  const bySupplier = new Map<number, PurchaseEntry[]>();
  for (const entry of inRange) {
    bySupplier.set(entry.supplierId, [...(bySupplier.get(entry.supplierId) ?? []), entry]);
  }
  const rows: ReportRow[] = [...bySupplier.entries()]
    .map(([id, list]) => ({
      link: `/admin/estoque/fornecedores/${id}`,
      cells: {
        fornecedor: name(id),
        entradas: list.length,
        itens: list.reduce((sum, entry) => sum + units(entry), 0),
        total: round2(list.reduce((sum, entry) => sum + entryTotal(entry.items), 0)),
        ultima: new Date(Math.max(...list.map((entry) => entry.date.getTime()))),
      },
    }))
    .sort((a, b) => (b.cells['total'] as number) - (a.cells['total'] as number));
  return {
    columns: [
      { key: 'fornecedor', label: 'Fornecedor', kind: 'text' },
      { key: 'entradas', label: 'Entradas', kind: 'int' },
      { key: 'itens', label: 'Itens', kind: 'int' },
      { key: 'total', label: 'Total comprado', kind: 'money' },
      { key: 'ultima', label: 'Última compra', kind: 'date' },
    ],
    rows,
    totals: {
      fornecedor: 'Total',
      entradas: inRange.length,
      itens: inRange.reduce((sum, entry) => sum + units(entry), 0),
      total: round2(inRange.reduce((sum, entry) => sum + entryTotal(entry.items), 0)),
    },
  };
}

const SHIPPING_LABELS: Record<AdminOrder['shipping'], string> = {
  economico: 'Econômico',
  expresso: 'Expresso',
  'em-maos': 'Entrega em mãos',
};

/** 5. Pagamento e entrega (pedidos válidos do período). */
export function paymentsReport(orders: readonly AdminOrder[], range: DateRange): ReportTable {
  const valid = validOrders(orders, range.start, range.end);
  const rowsFor = (
    type: string,
    keyOf: (o: AdminOrder) => string,
    labels: Record<string, string>,
  ) =>
    Object.keys(labels).map((key): ReportRow => {
      const list = valid.filter((order) => keyOf(order) === key);
      const value = round2(list.reduce((sum, order) => sum + netTotal(order), 0));
      return {
        cells: {
          tipo: type,
          opcao: labels[key],
          pedidos: list.length,
          valor: value,
          participacao: pct(list.length, valid.length),
        },
      };
    });
  return {
    columns: [
      { key: 'tipo', label: 'Tipo', kind: 'text' },
      { key: 'opcao', label: 'Opção', kind: 'text' },
      { key: 'pedidos', label: 'Pedidos', kind: 'int' },
      { key: 'valor', label: 'Valor', kind: 'money' },
      { key: 'participacao', label: '% dos pedidos', kind: 'pct' },
    ],
    rows: [
      ...rowsFor('Pagamento', (order) => order.payment, PAYMENT_METHOD_LABELS),
      ...rowsFor('Entrega', (order) => order.shipping, SHIPPING_LABELS),
    ],
    note: `${valid.length} pedidos válidos no período (cancelados fora). Cada tipo soma 100%.`,
  };
}

/** 6. Quem comprou no período (maior total primeiro) e novos × recorrentes. */
export function customersReport(
  orders: readonly AdminOrder[],
  customers: readonly AdminCustomer[],
  range: DateRange,
  maskEmail: (email: string) => string,
): ReportTable {
  const valid = validOrders(orders, range.start, range.end);
  const byEmail = new Map<string, AdminOrder[]>();
  for (const order of valid) {
    byEmail.set(order.customer.email, [...(byEmail.get(order.customer.email) ?? []), order]);
  }
  let fresh = 0;
  const rows: ReportRow[] = [...byEmail.entries()].map(([email, list]) => {
    const customer = customers.find((c) => c.email === email);
    const total = round2(list.reduce((sum, order) => sum + netTotal(order), 0));
    // Novo = a primeira compra da vida dele caiu dentro do período.
    if (customer && customer.since >= range.start) fresh++;
    return {
      link: customer ? `/admin/clientes/${customer.id}` : undefined,
      cells: {
        cliente: customer?.name ?? list[0].customer.name,
        email: customer?.anonymized ? '—' : maskEmail(email),
        pedidos: list.length,
        total,
        ticket: round2(total / list.length),
        ultima: new Date(Math.max(...list.map((order) => order.createdAt.getTime()))),
        tipo: customer && customer.since >= range.start ? 'Novo' : 'Recorrente',
      },
    };
  });
  rows.sort((a, b) => (b.cells['total'] as number) - (a.cells['total'] as number));
  const recurring = rows.length - fresh;
  return {
    columns: [
      { key: 'cliente', label: 'Cliente', kind: 'text' },
      { key: 'email', label: 'E-mail', kind: 'text' },
      { key: 'pedidos', label: 'Pedidos', kind: 'int' },
      { key: 'total', label: 'Total', kind: 'money' },
      { key: 'ticket', label: 'Ticket médio', kind: 'money' },
      { key: 'ultima', label: 'Última compra', kind: 'date' },
      { key: 'tipo', label: 'Novo ou recorrente', kind: 'text' },
    ],
    rows,
    totals: {
      cliente: 'Total',
      pedidos: valid.length,
      total: round2(valid.reduce((sum, order) => sum + netTotal(order), 0)),
    },
    note: `${rows.length} clientes compraram: ${fresh} novos (${pctText(fresh, rows.length)}) e ${recurring} recorrentes (${pctText(recurring, rows.length)}).`,
  };
}

// ----- CSV -----------------------------------------------------------------

const csvValue = (value: ReportValue | undefined, kind: CellKind): CsvValue => {
  if (value == null) return null;
  if (value instanceof Date)
    return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
  if (typeof value === 'number') return kind === 'money' ? round2(value) : value;
  return value;
};

/** Mesma tabela da tela, com a linha de totais no fim. */
export function reportCsv(table: ReportTable): string {
  const toRow = (cells: Record<string, ReportValue>) =>
    table.columns.map((column) => csvValue(cells[column.key], column.kind));
  const rows = table.rows.map((row) => toRow(row.cells));
  if (table.totals) rows.push(toRow(table.totals));
  return toCsv(
    table.columns.map((column) => (column.kind === 'pct' ? `${column.label} (%)` : column.label)),
    rows,
  );
}
