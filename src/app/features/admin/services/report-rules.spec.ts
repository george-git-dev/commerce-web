import { AdminOrder } from '../data/admin-orders-mock';
import { customRange } from './admin-metrics';
import {
  customersReport,
  paymentsReport,
  productsReport,
  reportCsv,
  reportRange,
  salesReport,
} from './report-rules';
import { buildCustomers } from './customer-rules';

function order(n: number, day: number, extra: Partial<AdminOrder> = {}): AdminOrder {
  return {
    number: `NP${n}`,
    createdAt: new Date(2026, 9, day, 12),
    status: 'entregue',
    customer: { name: `Cliente ${n}`, email: `c${n}@x.com`, city: 'São Paulo, SP', phone: '' },
    firstPurchase: false,
    items: [
      {
        slug: 'asad',
        sku: 'asad-100',
        kind: 'frasco',
        volumeMl: 100,
        variant: 'Frasco 100 ml',
        name: 'Asad',
        image: '',
        category: 'perfume',
        gender: 'masculino',
        quantity: 2,
        unitPrice: 100,
      },
    ],
    payment: 'pix',
    shipping: 'economico',
    address: null,
    history: [],
    subtotal: 200,
    shippingPrice: 15,
    total: 215,
    ...extra,
  } as AdminOrder;
}

const range = customRange(new Date(2026, 9, 1), new Date(2026, 9, 31));
const orders = [
  order(1, 2),
  order(2, 2, { payment: 'cartao', shipping: 'expresso' }),
  order(3, 5, { status: 'cancelado' }),
  order(1, 20, { number: 'NP4' }),
  order(9, 1, { createdAt: new Date(2026, 8, 30) }),
];

describe('relatórios', () => {
  it('período: mês passado e este ano', () => {
    const now = new Date(2026, 9, 10, 15);
    const last = reportRange('mes-passado', now);
    expect(last.start).toEqual(new Date(2026, 8, 1));
    expect(last.end.getDate()).toBe(30);
    expect(reportRange('ano', now).start).toEqual(new Date(2026, 0, 1));
  });

  it('vendas por dia: cancelado fora dos valores, totais certos', () => {
    const table = salesReport(orders, range, 'dia');
    expect(table.rows.map((r) => r.cells['periodo'])).toEqual([
      '02/10/2026',
      '05/10/2026',
      '20/10/2026',
    ]);
    expect(table.rows[0].cells['pedidos']).toBe(2);
    expect(table.rows[1].cells['cancelados']).toBe(1);
    expect(table.totals!['faturamento']).toBe(645);
    expect(table.totals!['ticket']).toBe(215);
  });

  it('produtos: custo e margem; sem custo fica vazio', () => {
    const withCost = productsReport(orders, range, () => 60);
    expect(withCost.rows[0].cells['quantidade']).toBe(6);
    expect(withCost.rows[0].cells['lucro']).toBe(240);
    expect(withCost.rows[0].cells['margem']).toBe(40);
    const noCost = productsReport(orders, range, () => undefined);
    expect(noCost.rows[0].cells['lucro']).toBeNull();
  });

  it('pagamento e entrega somam 100% em cada tipo', () => {
    const table = paymentsReport(orders, range);
    const pix = table.rows.find((r) => r.cells['opcao'] === 'Pix')!;
    expect(pix.cells['pedidos']).toBe(2);
    expect(pix.cells['participacao']).toBeCloseTo(66.7);
  });

  it('clientes: maior total primeiro e novos × recorrentes', () => {
    const customers = buildCustomers(orders, []);
    const table = customersReport(orders, customers, range, (e) => e);
    expect(table.rows[0].cells['cliente']).toBe('Cliente 1');
    expect(table.rows[0].cells['pedidos']).toBe(2);
    expect(table.note).toContain('2 clientes compraram');
  });

  it('exporta CSV com a linha de totais', () => {
    const csv = reportCsv(salesReport(orders, range, 'mes'));
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('"Mês";"Pedidos"');
    expect(lines.at(-1)).toBe('"Total";3;6;645;45;215;1');
  });
});
