import { Address, Order } from '../models/order';
import { Product } from '../models/product';
import { effectivePrice, variantLabel } from '../utils/product-pricing';

/** Endereço FICTÍCIO usado nos pedidos de exemplo e no endereço inicial da conta. */
export const SAMPLE_ADDRESS: Address = {
  cep: '05794-340',
  street: 'Rua das Acácias',
  number: '120',
  complement: '',
  district: 'Centro',
  city: 'São Paulo',
  state: 'SP',
};

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

/**
 * Pedidos de exemplo FICTÍCIOS para cada conta (só para testar Minha conta):
 * um entregue (botão "Avaliar"), um enviado com rastreio e um aguardando Pix.
 * Na Fase 2 somem — a lista vem de `GET /me/orders`.
 */
export function sampleOrders(name: string, find: (slug: string) => Product | undefined): Order[] {
  const address = SAMPLE_ADDRESS;
  const item = (number: string, index: number, slug: string, quantity = 1) => {
    const product = find(slug)!;
    const variant = product.variants[0];
    return {
      id: `${number}-${index}`,
      slug,
      productName: product.name,
      variantLabel: variantLabel(product, variant),
      image: product.images[0] ?? '',
      quantity,
      unitPrice: effectivePrice(variant),
    };
  };
  const build = (
    number: string,
    days: number,
    status: Order['status'],
    payment: Order['payment'],
    items: Order['items'],
    shippingPrice: number,
    trackingCode?: string,
  ): Order => {
    const subtotal = items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    return {
      number,
      createdAt: daysAgo(days),
      status,
      trackingCode,
      items,
      address: { recipient: name, ...address },
      billing: { document: '', name, address },
      shipping: {
        id: 'economico',
        label: 'Econômico',
        minDays: 3,
        maxDays: 5,
        price: shippingPrice,
      },
      payment,
      subtotal,
      discount: 0,
      pixDiscount: 0,
      shippingPrice,
      total: subtotal + shippingPrice,
    };
  };

  return [
    build(
      'NP100258',
      1,
      'aguardando-pagamento',
      { method: 'pix' },
      [item('NP100258', 1, 'maison-alhambra-delilah')],
      14.9,
    ),
    build(
      'NP100245',
      4,
      'enviado',
      { method: 'cartao', installments: 3, cardLast4: '1111', cardBrand: 'Visa' },
      [item('NP100245', 1, 'lattafa-khamrah')],
      14.9,
      'BR123456789BR',
    ),
    build(
      'NP100231',
      20,
      'entregue',
      { method: 'pix' },
      [item('NP100231', 1, 'lattafa-asad'), item('NP100231', 2, 'lattafa-yara-body-mist', 2)],
      0,
    ),
  ];
}
