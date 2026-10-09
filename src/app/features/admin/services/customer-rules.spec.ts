import { isValidCpf } from '../../../core/utils/br-format';
import { AdminOrder } from '../data/admin-orders-mock';
import {
  blockReasonProblem,
  buildCustomers,
  fakeCpf,
  matchesCustomer,
  sortCustomers,
} from './customer-rules';

function order(email: string, day: number, total: number, extra: Partial<AdminOrder> = {}) {
  return {
    number: `NP${email}${day}`,
    createdAt: new Date(2026, 9, day),
    status: 'entregue',
    customer: { name: 'Ana Souza', email, city: 'São Paulo, SP', phone: '(11) 98765-4321' },
    firstPurchase: false,
    items: [],
    payment: 'pix',
    shipping: 'economico',
    address: {
      street: 'Rua A',
      number: '10',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      cep: '01000-000',
    },
    history: [],
    subtotal: total,
    shippingPrice: 0,
    total,
    ...extra,
  } as AdminOrder;
}

describe('clientes do backoffice', () => {
  const orders = [
    order('ana@x.com', 1, 100),
    order('ana@x.com', 5, 300),
    order('ana@x.com', 6, 999, { status: 'cancelado' }),
    order('bia@x.com', 3, 50, {
      customer: {
        name: 'Bia Lima',
        email: 'bia@x.com',
        city: 'Santos, SP',
        phone: '(13) 99999-0000',
      },
    }),
  ];
  const accounts = [
    {
      name: 'Vizinho',
      email: 'vizinho@x.com',
      city: 'São Paulo, SP',
      phone: '',
      createdAt: new Date(2026, 9, 7),
    },
  ];

  it('junta pedidos por e-mail, soma sem cancelados e inclui conta sem compra', () => {
    const list = buildCustomers(orders, accounts);
    expect(list.map((c) => c.email)).toEqual(['ana@x.com', 'bia@x.com', 'vizinho@x.com']);
    const ana = list[0];
    expect(ana.id).toBe(1001);
    expect(ana.orderCount).toBe(2);
    expect(ana.cancelledCount).toBe(1);
    expect(ana.totalSpent).toBe(400);
    expect(ana.averageTicket).toBe(200);
    expect(ana.addresses).toHaveLength(1);
    expect(ana.orders[0].createdAt).toEqual(new Date(2026, 9, 6));
    expect(list[2].orderCount).toBe(0);
    expect(list[2].lastOrderAt).toBeNull();
  });

  it('busca por nome sem acento, e-mail ou telefone; ordena', () => {
    const [ana, bia, vizinho] = buildCustomers(orders, accounts);
    expect(matchesCustomer(ana, 'ANA souza')).toBe(true);
    expect(matchesCustomer(bia, 'bia@')).toBe(true);
    expect(matchesCustomer(bia, '9999')).toBe(true);
    expect(matchesCustomer(ana, 'bia')).toBe(false);
    expect(sortCustomers([vizinho, bia, ana], 'total').map((c) => c.email)[0]).toBe('ana@x.com');
    expect(sortCustomers([vizinho, ana, bia], 'ultima-compra').at(-1)?.email).toBe('vizinho@x.com');
  });

  it('CPF fictício sempre válido e motivo do bloqueio obrigatório', () => {
    for (const seed of [1001, 1002, 4321, 99999]) expect(isValidCpf(fakeCpf(seed))).toBe(true);
    expect(fakeCpf(1001)).toBe(fakeCpf(1001));
    expect(blockReasonProblem('')).not.toBeNull();
    expect(blockReasonProblem('fraude no cartão')).toBeNull();
  });
});
