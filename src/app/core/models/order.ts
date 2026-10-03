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

export type PaymentMethod = 'pix' | 'cartao' | 'boleto';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cartao: 'Cartão de crédito',
  boleto: 'Boleto',
};

export interface OrderItem {
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
  status: 'aguardando-pagamento' | 'pago';
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
