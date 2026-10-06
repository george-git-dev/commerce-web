import { MOCK_PRODUCTS } from '../../../core/data/mock-products';
import { OrderStatus, PaymentMethod } from '../../../core/models/order';
import { Gender, ProductCategory } from '../../../core/models/product';
import { ShippingOption } from '../../../core/models/shipping';
import { effectivePrice } from '../../../core/utils/product-pricing';

/** Pedido como o backoffice enxerga (formato provável de `GET /admin/orders`). */
export interface AdminOrderItem {
  slug: string;
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

/** Variantes com estoque igual ou abaixo disto aparecem como "estoque baixo". */
export const LOW_STOCK_THRESHOLD = 5;
/** Avaliações aguardando moderação (mock até a tela de Aprovações). */
export const PENDING_REVIEWS_MOCK = 4;

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

/**
 * Pedidos FICTÍCIOS dos últimos 60 dias (o painel compara 30 dias com os 30
 * anteriores). Some na Fase 2: os números vêm de `GET /admin/dashboard`.
 */
export function adminOrdersMock(now = new Date()): AdminOrder[] {
  const random = seeded(2026);
  const products = MOCK_PRODUCTS.filter((product) => product.status === 'publicado');
  const seen = new Set<string>();
  const orders: AdminOrder[] = [];
  let number = 100150;

  for (let ageDays = 59; ageDays >= 0; ageDays--) {
    // Mais movimento nos últimos 30 dias (a loja está crescendo).
    const perDay = Math.floor(random() * (ageDays < 30 ? 3 : 2.2));
    for (let n = 0; n < perDay; n++) {
      const createdAt = new Date(now);
      createdAt.setDate(now.getDate() - ageDays);
      createdAt.setHours(9 + Math.floor(random() * 12), Math.floor(random() * 60), 0, 0);
      if (createdAt > now) createdAt.setTime(now.getTime() - 60_000 * (n + 1));

      const customerIndex = Math.floor(random() * CUSTOMERS.length);
      const [name, city] = CUSTOMERS[customerIndex];
      const email = `${name.split(' ')[0].toLowerCase()}@exemplo.com.br`;
      const items = Array.from({ length: random() < 0.25 ? 2 : 1 }, () => {
        // Os primeiros produtos do catálogo vendem mais.
        const product = products[Math.floor(random() ** 1.6 * products.length)];
        return {
          slug: product.slug,
          name: product.name,
          image: product.images[0] ?? '',
          category: product.category,
          gender: product.gender,
          quantity: random() < 0.2 ? 2 : 1,
          unitPrice: effectivePrice(product.variants[0]),
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
          phone: `(11) 9${String(87650000 + customerIndex * 1373).slice(0, 4)}-${String(1000 + customerIndex * 211).slice(-4)}`,
        },
        firstPurchase: !seen.has(email),
        items,
        payment,
        shipping,
        address:
          shipping === 'em-maos'
            ? null
            : {
                street: STREETS[customerIndex % STREETS.length],
                number: String(10 + customerIndex * 37),
                district: 'Centro',
                city: cityName,
                state,
                cep: `0${String(1000 + customerIndex * 211).slice(-4)}-${String(100 + customerIndex).slice(-3)}`,
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
