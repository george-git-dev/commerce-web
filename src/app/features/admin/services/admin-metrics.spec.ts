import { AdminOrder } from '../data/admin-orders-mock';
import {
  customRange,
  customRangeProblem,
  dailySeries,
  delta,
  filterOrders,
  kpis,
  periodRange,
  revenueOf,
  salesByGroup,
  statusCounts,
  topProducts,
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

  it('indicadores ignoram cancelados e comparam com o período anterior', () => {
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
    expect(delta(400, 200)).toBe(100);
    expect(delta(5, 0)).toBeNull();
  });

  it('série diária, top produtos, status e grupos de venda', () => {
    const orders = [order(0, 300), order(1, 100, { status: 'entregue' }), order(1, 50)];
    const series = dailySeries(orders, now, 7, revenueOf);
    expect(series).toHaveLength(7);
    expect(series.at(-1)).toEqual({ label: '06/10', value: 300 });
    expect(series.at(-2)?.value).toBe(150);
    const { start, end } = periodRange('7d', now);
    expect(topProducts(orders, start, end)[0].units).toBe(3);
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
    expect(customRangeProblem('', '2026-10-01', '2026-10-06')).toContain('duas datas');
    expect(customRangeProblem('2026-09-01', '2026-09-01', '2026-10-06')).toBeNull();
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
