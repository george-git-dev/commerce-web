import { ShippingOption } from './shipping';

export interface Address {
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
}

export interface DeliveryAddress extends Address {
  recipient: string;
}

/** Dados da nota fiscal: CPF/CNPJ, nome e endereço de cobrança. */
export interface BillingInfo {
  document: string;
  name: string;
  address: Address;
}

export type OrderStatus =
  'aguardando-pagamento' | 'pago' | 'em-separacao' | 'enviado' | 'entregue' | 'cancelado';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  'aguardando-pagamento': 'Aguardando pagamento',
  pago: 'Pagamento aprovado',
  'em-separacao': 'Em separação',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

/** Etapas da linha do tempo, na ordem (cancelado fica de fora). */
export const ORDER_TIMELINE: readonly { status: OrderStatus; label: string }[] = [
  { status: 'aguardando-pagamento', label: 'Pedido recebido' },
  { status: 'pago', label: 'Pagamento aprovado' },
  { status: 'em-separacao', label: 'Em separação' },
  { status: 'enviado', label: 'Enviado' },
  { status: 'entregue', label: 'Entregue' },
];

export type PaymentMethod = 'pix' | 'cartao' | 'boleto';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cartao: 'Cartão de crédito',
  boleto: 'Boleto',
};

export interface OrderItem {
  /** Identifica o item dentro do pedido (usado na avaliação). */
  id: string;
  slug: string;
  productName: string;
  variantLabel: string;
  image: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Pedido criado no checkout. No mock, montado no front; na Fase 2 é a resposta
 * do `POST /orders` — o back recalcula preços, frete e desconto e devolve isto.
 */
export interface Order {
  number: string;
  createdAt: string;
  status: OrderStatus;
  /** Código de rastreio, quando já foi enviado. */
  trackingCode?: string;
  items: readonly OrderItem[];
  address: DeliveryAddress;
  billing: BillingInfo;
  shipping: ShippingOption;
  payment: {
    method: PaymentMethod;
    installments?: number;
    /** Só os 4 últimos dígitos, como o gateway devolve — nunca o número inteiro. */
    cardLast4?: string;
    cardBrand?: string;
  };
  couponCode?: string;
  subtotal: number;
  discount: number;
  pixDiscount: number;
  shippingPrice: number;
  total: number;
}
