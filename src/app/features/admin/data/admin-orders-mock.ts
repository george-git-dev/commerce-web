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

export interface AdminOrder {
  number: string;
  createdAt: Date;
  status: OrderStatus;
  customer: { name: string; email: string; city: string };
  /** Primeira compra deste cliente (conta como "cliente novo" no painel). */
  firstPurchase: boolean;
  items: readonly AdminOrderItem[];
  payment: PaymentMethod;
  shipping: ShippingOption['id'];
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

      const [name, city] = CUSTOMERS[Math.floor(random() * CUSTOMERS.length)];
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

      orders.push({
        number: `NP${++number}`,
        createdAt,
        status: statusFor(ageDays, random()),
        customer: { name, email, city },
        firstPurchase: !seen.has(email),
        items,
        payment,
        shipping,
        total: Math.round((subtotal + freight) * 100) / 100,
      });
      seen.add(email);
    }
  }
  return orders.reverse();
}
