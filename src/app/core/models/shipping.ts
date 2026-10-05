/** Uma opção de entrega para o CEP informado (formato do futuro `POST /shipping/quote`). */
export interface ShippingOption {
  id: 'economico' | 'expresso' | 'em-maos';
  label: string;
  /** Prazo em dias úteis após a aprovação do pagamento. */
  minDays: number;
  maxDays: number;
  /** 0 = grátis. */
  price: number;
  /** Aviso extra na opção (ex.: entrega em mãos combinada pelo WhatsApp). */
  note?: string;
}
