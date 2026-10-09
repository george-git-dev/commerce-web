import { AdminOrder } from '../data/admin-orders-mock';
import {
  customRange,
  customRangeProblem,
  dayRange,
  salesRows,
  totalRow,
  unitsOf,
  monthlySeries,
  monthRange,
  dailySeries,
  filterOrders,
  kpis,
  periodRange,
  revenueOf,
  salesByGroup,
  statusCounts,
  productSales,
  grossProfit,
  cancelledOrders,
  yearlySeries,
  matchesFormat,
  compareFormats,
} from './admin-metrics';

const now = new Date(2026, 9, 6, 15, 0);

function order(days: number, total: number, extra: Partial<AdminOrder> = {}): AdminOrder {
  const createdAt = new Date(now);
  createdAt.setDate(now.getDate() - days);
  return {
    number: `NP${days}${total}`,
    createdAt,
    status: 'pago',
    customer: { name: 'Ana', email: 'ana@x.com', city: 'São Paulo, SP', phone: '' },
    firstPurchase: false,
    items: [
      {
        slug: 'lattafa-asad',
        sku: 'lattafa-asad-100',
        kind: 'frasco',
        volumeMl: 100,
        variant: 'Frasco 100 ml',
        name: 'Asad',
        image: '',
        category: 'perfume',
        gender: 'Masculino',
        quantity: 1,
        unitPrice: total,
      },
    ],
    payment: 'pix',
    shipping: 'economico',
    address: null,
    history: [],
    subtotal: total,
    shippingPrice: 0,
    total,
    ...extra,
  };
}

describe('métricas do painel', () => {
  it('períodos: hoje, 7 e 30 dias e mês atual, com o anterior de mesmo tamanho', () => {
    const week = periodRange('7d', now);
    expect(week.days).toBe(7);
    expect(week.start).toEqual(new Date(2026, 8, 30));
    expect(week.previousStart).toEqual(new Date(2026, 8, 23));
    expect(periodRange('hoje', now).days).toBe(1);
    expect(periodRange('mes', now).start).toEqual(new Date(2026, 9, 1));
    expect(periodRange('mes', now).days).toBe(6);
  });

  it('indicadores ignoram cancelados; período anterior de mesmo tamanho', () => {
    const orders = [
      order(0, 300, { firstPurchase: true }),
      order(2, 100),
      order(3, 999, { status: 'cancelado' }),
      order(10, 200),
    ];
    const { start, end, previousStart, previousEnd } = periodRange('7d', now);
    const current = kpis(orders, start, end);
    expect(current).toEqual({ revenue: 400, orders: 2, averageTicket: 200, newCustomers: 1 });
    expect(kpis(orders, previousStart, previousEnd).revenue).toBe(200);
  });

  it('série diária, top produtos, status e grupos de venda', () => {
    const orders = [order(0, 300), order(1, 100, { status: 'entregue' }), order(1, 50)];
    const series = dailySeries(orders, now, 7, revenueOf);
    expect(series).toHaveLength(7);
    expect(series.at(-1)).toEqual({ label: '06/10', value: 300 });
    expect(series.at(-2)?.value).toBe(150);
    const { start, end } = periodRange('7d', now);
    const costOf = (sku: string) => (sku === 'lattafa-asad-100' ? 60 : undefined);
    expect(productSales(orders, start, end, costOf)[0]).toEqual(
      expect.objectContaining({ units: 3, revenue: 450, cost: 180 }),
    );
    expect(statusCounts(orders, start, end).find((s) => s.status === 'pago')?.count).toBe(2);
    expect(salesByGroup(orders, start, end)[0]).toEqual({ group: 'Masculinos', value: 450 });
  });

  it('período personalizado: de/até inteiros, anterior de mesmo tamanho e validação', () => {
    const range = customRange(new Date(2026, 8, 1), new Date(2026, 8, 10));
    expect(range.days).toBe(10);
    expect(range.end).toEqual(new Date(2026, 8, 10, 23, 59, 59, 999));
    expect(range.previousStart).toEqual(new Date(2026, 7, 22));
    expect(customRangeProblem('2026-09-10', '2026-09-01', '2026-10-06')).toContain('antes');
    expect(customRangeProblem('2026-09-01', '2026-10-07', '2026-10-06')).toContain('futuro');
    // Ano ainda sendo digitado ("0020") não vira um período de séculos.
    expect(customRangeProblem('0020-09-09', '2026-10-06', '2026-10-06')).toContain('2020');
    expect(customRangeProblem('', '2026-10-01', '2026-10-06')).toContain('duas datas');
    expect(customRangeProblem('2026-09-01', '2026-09-01', '2026-10-06')).toBeNull();
  });

  it('dia: o dia inteiro contra o anterior; mês: mesmos dias do mês anterior', () => {
    const day = dayRange(new Date(2026, 9, 3), now);
    expect(day.start).toEqual(new Date(2026, 9, 3));
    expect(day.previousStart).toEqual(new Date(2026, 9, 2));
    expect(dayRange(now, now).end).toEqual(now);
    const current = monthRange('2026-10', now)!;
    expect(current.days).toBe(6);
    expect(current.previousStart).toEqual(new Date(2026, 8, 1));
    expect(current.previousEnd).toEqual(new Date(2026, 8, 6, 23, 59, 59, 999));
    const september = monthRange('2026-09', now)!;
    expect(september.days).toBe(30);
    expect(september.previousEnd).toEqual(new Date(2026, 7, 30, 23, 59, 59, 999));
    expect(monthRange('x', now)).toBeNull();
  });

  it('tabela de vendas: linha por dia, ticket médio e total', () => {
    const orders = [order(0, 300), order(0, 100, { firstPurchase: true }), order(1, 50)];
    expect(unitsOf(orders)).toBe(3);
    const series = (value: (o: readonly AdminOrder[]) => number) =>
      dailySeries(orders, now, 2, value);
    const rows = salesRows({
      revenue: series(revenueOf),
      orders: series((o) => o.length),
      units: series(unitsOf),
      newCustomers: series((o) => o.filter((x) => x.firstPurchase).length),
    });
    expect(rows[1]).toEqual({
      label: '06/10',
      orders: 2,
      units: 2,
      revenue: 400,
      averageTicket: 200,
      newCustomers: 1,
    });
    expect(totalRow(rows)).toEqual({
      label: 'Total',
      orders: 3,
      units: 3,
      revenue: 450,
      averageTicket: 150,
      newCustomers: 1,
    });
  });

  it('série por mês', () => {
    const orders = [order(0, 300), order(40, 100)];
    const series = monthlySeries(orders, new Date(2026, 7, 1), now, revenueOf);
    expect(series.map((p) => p.label)).toEqual(['ago/26', 'set/26', 'out/26']);
    expect(series.map((p) => p.value)).toEqual([100, 0, 300]);
  });

  it('série por ano: ano cortado conta só os dias de dentro', () => {
    const orders = [order(0, 300), order(200, 100), order(400, 50)];
    const series = yearlySeries(orders, new Date(2025, 5, 1), now, revenueOf);
    expect(series).toEqual([
      { label: '2025', value: 50 },
      { label: '2026', value: 400 },
    ]);
  });

  it('lucro bruto, produto sem custo e pedidos cancelados', () => {
    const yara = { ...order(0, 0).items[0], slug: 'lattafa-yara', sku: 'lattafa-yara-100' };
    const orders = [
      order(0, 200),
      order(1, 100, { items: [{ ...yara, unitPrice: 100 }] }),
      order(2, 50, { status: 'cancelado' }),
      order(3, 80),
    ];
    const costOf = (sku: string) => (sku === 'lattafa-asad-100' ? 70 : undefined);
    const valid = orders.filter((o) => o.status !== 'cancelado');
    // Só o Asad tem custo: (200 + 80) − 2 × 70 = 140, margem 50%.
    expect(grossProfit(valid, costOf)).toEqual({ profit: 140, margin: 50, uncosted: 1 });
    expect(grossProfit([], costOf).margin).toBeNull();
    const { start, end } = periodRange('7d', now);
    expect(cancelledOrders(orders, start, end)).toBe(1);
    expect(cancelledOrders([], start, end)).toBe(0);
    expect(
      productSales(orders, start, end, costOf).find((p) => p.slug === 'lattafa-yara')?.cost,
    ).toBeNull();
  });

  it('formato: frasco, kit e decant por tamanho, no ranking e no filtro', () => {
    const base = order(0, 0).items[0];
    const decant5 = {
      ...base,
      sku: 'lattafa-asad-d5',
      kind: 'decant' as const,
      volumeMl: 5,
      variant: 'Decant 5 ml',
      unitPrice: 35,
    };
    const decant2 = {
      ...decant5,
      sku: 'lattafa-asad-d2',
      volumeMl: 2,
      variant: 'Decant 2 ml',
      unitPrice: 20,
    };
    const kit = { ...base, slug: 'kit-presente', sku: 'kit-1', category: 'kit', unitPrice: 400 };
    const orders = [
      order(0, 300),
      order(1, 35, { items: [decant5, { ...decant2, quantity: 2 }] }),
      order(2, 400, { items: [kit] }),
    ];
    const costOf = (sku: string) => (sku === 'lattafa-asad-d5' ? 10 : undefined);
    const { start, end } = periodRange('7d', now);
    // Mesmo perfume, duas linhas no ranking (frasco e decant são variantes).
    const asad = productSales(orders, start, end, costOf).filter((p) => p.slug === 'lattafa-asad');
    expect(asad.map((p) => p.variant)).toEqual(['Frasco 100 ml', 'Decant 2 ml', 'Decant 5 ml']);
    expect(asad.map((p) => p.format)).toEqual(['frasco', 'decant:2', 'decant:5']);
    expect(matchesFormat(decant2, 'decant')).toBe(true);
    expect(matchesFormat(decant2, 'decant:5')).toBe(false);
    expect(matchesFormat(kit, 'frasco')).toBe(false);
    expect(matchesFormat(kit, 'kit')).toBe(true);
    const lotion = { ...base, category: 'hidratante', variant: 'Hidratante 200 ml' };
    expect(matchesFormat(lotion, 'hidratante')).toBe(true);
    expect(matchesFormat(lotion, 'frasco')).toBe(false);
    expect(
      ['body-splash', 'decant:5', 'kit', 'frasco', 'hidratante', 'decant:2'].sort(compareFormats),
    ).toEqual(['frasco', 'decant:2', 'decant:5', 'kit', 'hidratante', 'body-splash']);
    expect(matchesFormat(base, '')).toBe(true);
  });

  it('filtro deixa só os itens que passam e recalcula o total sem frete', () => {
    const base = order(0, 300, { shippingPrice: 20, total: 320 });
    const mixed: AdminOrder = {
      ...base,
      items: [...base.items, { ...base.items[0], slug: 'lattafa-yara', unitPrice: 100 }],
    };
    expect(filterOrders([mixed], null)).toEqual([mixed]);
    const onlyYara = filterOrders([mixed], (item) => item.slug === 'lattafa-yara');
    expect(onlyYara).toHaveLength(1);
    expect(onlyYara[0].items).toHaveLength(1);
    expect(onlyYara[0].total).toBe(100);
    expect(filterOrders([mixed], () => false)).toEqual([]);
  });
});
