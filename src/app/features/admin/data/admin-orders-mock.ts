import { MOCK_PRODUCTS } from '../../../core/data/mock-products';
import { OrderStatus, PaymentMethod } from '../../../core/models/order';
import { Gender, ProductCategory, VariantKind } from '../../../core/models/product';
import { ShippingOption } from '../../../core/models/shipping';
import { effectivePrice, variantLabel } from '../../../core/utils/product-pricing';

/** Pedido como o backoffice enxerga (formato provável de `GET /admin/orders`). */
export interface AdminOrderItem {
  slug: string;
  /** Variante vendida (frasco ou tamanho de decant) — base do custo. */
  sku: string;
  kind: VariantKind;
  volumeMl?: number;
  /** Rótulo da variante na hora da venda: "Frasco 100 ml", "Decant 5 ml", "Kit". */
  variant: string;
  name: string;
  image: string;
  category: ProductCategory;
  gender: Gender;
  quantity: number;
  unitPrice: number;
}

export interface AdminOrderAddress {
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  cep: string;
}

/** Uma mudança de status, com quando e quem fez ("Sistema" = automático/gateway). */
export interface AdminOrderEvent {
  status: OrderStatus;
  at: Date;
  by: string;
}

export interface AdminOrder {
  number: string;
  createdAt: Date;
  status: OrderStatus;
  customer: { name: string; email: string; city: string; phone: string };
  /** Primeira compra deste cliente (conta como "cliente novo" no painel). */
  firstPurchase: boolean;
  items: readonly AdminOrderItem[];
  payment: PaymentMethod;
  shipping: ShippingOption['id'];
  /** `null` = entrega em mãos (sem endereço de entrega). */
  address: AdminOrderAddress | null;
  trackingCode?: string;
  cancelReason?: string;
  history: readonly AdminOrderEvent[];
  subtotal: number;
  shippingPrice: number;
  total: number;
}

const CUSTOMERS = [
  ['Mariana Oliveira', 'São Paulo, SP'],
  ['Lucas Santos', 'Campinas, SP'],
  ['Ana Beatriz Costa', 'Santo André, SP'],
  ['Rafael Almeida', 'Guarulhos, SP'],
  ['Camila Ferreira', 'Santos, SP'],
  ['Bruno Ribeiro', 'São Paulo, SP'],
  ['Juliana Martins', 'Osasco, SP'],
  ['Felipe Carvalho', 'Sorocaba, SP'],
  ['Larissa Gomes', 'São Paulo, SP'],
  ['Thiago Rocha', 'Jundiaí, SP'],
  ['Beatriz Lima', 'São Bernardo do Campo, SP'],
  ['Gustavo Pereira', 'Ribeirão Preto, SP'],
  ['Isabela Souza', 'São Paulo, SP'],
  ['Matheus Barbosa', 'Taboão da Serra, SP'],
  ['Letícia Araújo', 'Mogi das Cruzes, SP'],
  ['Pedro Henrique Dias', 'São José dos Campos, SP'],
  ['Gabriela Teixeira', 'São Paulo, SP'],
  ['Vinícius Moreira', 'Diadema, SP'],
] as const;

/** Gerador pseudoaleatório com semente: os mesmos pedidos a cada carga. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STREETS = [
  'Rua das Acácias',
  'Av. Paulista',
  'Rua Augusta',
  'Rua dos Pinheiros',
  'Rua Haddock Lobo',
];

/** Caminho até o status atual, com datas a partir da compra. */
function historyFor(status: OrderStatus, createdAt: Date, now: Date): AdminOrderEvent[] {
  const at = (hours: number) =>
    new Date(Math.min(createdAt.getTime() + hours * 3_600_000, now.getTime()));
  if (status === 'cancelado') {
    return [
      { status: 'aguardando-pagamento', at: createdAt, by: 'Sistema' },
      { status: 'cancelado', at: at(30), by: 'Sistema' },
    ];
  }
  const flow: OrderStatus[] = [
    'aguardando-pagamento',
    'pago',
    'em-separacao',
    'enviado',
    'entregue',
  ];
  const hours = [0, 0.2, 20, 44, 120];
  const by = ['Sistema', 'Sistema', 'George', 'George', 'George'];
  return flow
    .slice(0, flow.indexOf(status) + 1)
    .map((step, index) => ({ status: step, at: at(hours[index]), by: by[index] }));
}

/** Status coerente com a idade do pedido (antigos já entregues). */
function statusFor(ageDays: number, roll: number): OrderStatus {
  if (roll < 0.08) return 'cancelado';
  if (ageDays > 12) return 'entregue';
  if (ageDays > 6) return roll < 0.5 ? 'entregue' : 'enviado';
  if (ageDays > 2) return roll < 0.35 ? 'pago' : roll < 0.65 ? 'em-separacao' : 'enviado';
  return roll < 0.3 ? 'aguardando-pagamento' : roll < 0.75 ? 'pago' : 'em-separacao';
}

/** Pedidos por dia, em média: a loja cresce a cada ano (mock desde 2024). */
const DAILY_RATE: Record<number, number> = { 2024: 0.6, 2025: 1.1 };
const CURRENT_RATE = 1.6;

/** Datas fortes do varejo: Dia das Mães (mai), Black Friday (nov) e Natal (dez). */
const SEASON = [1, 0.9, 1, 1, 1.4, 1, 1, 1.1, 1, 1, 1.6, 1.9];

/**
 * Pedidos FICTÍCIOS de 1º/01/2024 até hoje — volume crescendo por ano e com
 * picos sazonais, para ver o painel por dia, mês e ano. Parte dos pedidos é
 * de cliente que volta (recompra). Some na Fase 2: os números vêm de
 * `GET /admin/dashboard`.
 */
export function adminOrdersMock(now = new Date()): AdminOrder[] {
  const random = seeded(2026);
  const products = MOCK_PRODUCTS.filter((product) => product.status === 'publicado');
  const seen = new Set<string>();
  /** Clientes que já compraram (para sortear recompra). */
  /** Cada cliente: nome/cidade da lista + nº próprio (e-mail, telefone e endereço únicos). */
  const known: { index: number; email: string; n: number }[] = [];
  const orders: AdminOrder[] = [];
  let number = 100000;

  const first = new Date(2024, 0, 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const totalDays = Math.round((today.getTime() - first.getTime()) / 86_400_000);

  for (let ageDays = totalDays; ageDays >= 0; ageDays--) {
    const day = new Date(today);
    day.setDate(today.getDate() - ageDays);
    const rate = (DAILY_RATE[day.getFullYear()] ?? CURRENT_RATE) * SEASON[day.getMonth()];
    // Média = `rate` pedidos por dia (0 a 2 × rate).
    const perDay = Math.floor(random() * (2 * rate + 1));
    for (let n = 0; n < perDay; n++) {
      const createdAt = new Date(day);
      createdAt.setHours(9 + Math.floor(random() * 12), Math.floor(random() * 60), 0, 0);
      if (createdAt > now) createdAt.setTime(now.getTime() - 60_000 * (n + 1));

      // ~45% é recompra de quem já comprou; o resto, cliente novo.
      const returning = known.length > 0 && random() < 0.45;
      const customer = returning
        ? known[Math.floor(random() * known.length)]
        : (() => {
            const index = Math.floor(random() * CUSTOMERS.length);
            const handle = CUSTOMERS[index][0].split(' ')[0].toLowerCase();
            const n = known.length + 1;
            return { index, email: `${handle}.${n}@exemplo.com.br`, n };
          })();
      if (!returning) known.push(customer);
      const customerIndex = customer.index;
      const [name, city] = CUSTOMERS[customerIndex];
      const email = customer.email;
      const items = Array.from({ length: random() < 0.25 ? 2 : 1 }, () => {
        // Os primeiros produtos do catálogo vendem mais.
        const product = products[Math.floor(random() ** 1.6 * products.length)];
        // Quem tem decant vende decant em ~55% das vezes (tamanho sorteado).
        const decants = product.variants.filter((v) => v.kind === 'decant');
        const variant =
          decants.length && random() < 0.55
            ? decants[Math.floor(random() * decants.length)]
            : product.variants[0];
        return {
          slug: product.slug,
          sku: variant.id,
          kind: variant.kind,
          volumeMl: variant.volumeMl,
          variant: variantLabel(product, variant),
          name: product.name,
          image: product.images[0] ?? '',
          category: product.category,
          gender: product.gender,
          // Decant costuma sair em mais de uma unidade (1 a 3).
          quantity:
            variant.kind === 'decant' ? 1 + Math.floor(random() * 3) : random() < 0.2 ? 2 : 1,
          unitPrice: effectivePrice(variant),
        };
      });
      const shipping: ShippingOption['id'] =
        random() < 0.2 ? 'em-maos' : random() < 0.7 ? 'economico' : 'expresso';
      const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const freight = shipping === 'em-maos' ? 0 : shipping === 'expresso' ? 24.9 : 14.9;
      const payment: PaymentMethod =
        random() < 0.55 ? 'pix' : random() < 0.85 ? 'cartao' : 'boleto';

      const status = statusFor(ageDays, random());
      const [cityName, state] = city.split(', ');
      const shipped = ['enviado', 'entregue'].includes(status) && shipping !== 'em-maos';

      orders.push({
        number: `NP${++number}`,
        createdAt,
        status,
        customer: {
          name,
          email,
          city,
          phone: `(11) 9${String(1000 + ((customer.n * 7919) % 9000)).slice(-4)}-${String(1000 + ((customer.n * 4271) % 9000)).slice(-4)}`,
        },
        firstPurchase: !seen.has(email),
        items,
        payment,
        shipping,
        address:
          shipping === 'em-maos'
            ? null
            : {
                street: STREETS[customer.n % STREETS.length],
                number: String(10 + ((customer.n * 37) % 990)),
                district: 'Centro',
                city: cityName,
                state,
                cep: `0${String(1000 + ((customer.n * 211) % 9000)).slice(-4)}-${String(100 + (customer.n % 900)).slice(-3)}`,
              },
        trackingCode: shipped ? `BR${String(100000000 + number * 7).slice(-9)}BR` : undefined,
        cancelReason: status === 'cancelado' ? 'Pagamento não confirmado no prazo.' : undefined,
        history: historyFor(status, createdAt, now),
        subtotal: Math.round(subtotal * 100) / 100,
        shippingPrice: freight,
        total: Math.round((subtotal + freight) * 100) / 100,
      });
      seen.add(email);
    }
  }
  return orders.reverse();
}
