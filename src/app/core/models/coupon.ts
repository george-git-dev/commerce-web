/** Cupom de desconto (formato do futuro `POST /cart/coupon`). */
export interface Coupon {
  code: string;
  /** Texto curto exibido quando aplicado ("10% de desconto"). */
  description: string;
  /** `percent` e `fixed` descontam dos produtos; `shipping` zera o frete. */
  kind: 'percent' | 'fixed' | 'shipping';
  /** Porcentagem (10 = 10%) ou valor em R$; ignorado em `shipping`. */
  value: number;
  /** Subtotal mínimo dos produtos para valer. */
  minSubtotal?: number;
}
