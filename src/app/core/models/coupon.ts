/** `percent` e `fixed` descontam dos produtos; `shipping` zera o frete. */
export type CouponKind = 'percent' | 'fixed' | 'shipping';

/**
 * Cupom de desconto: o cliente digita o código no carrinho. Contrato do futuro
 * `GET/POST/PUT /admin/coupons`; na loja, `POST /cart/coupon` é só prévia — o
 * back recalcula o desconto e conta o uso ao criar o pedido.
 */
export interface Coupon {
  id: number;
  /** Código digitado pelo cliente (maiúsculas e números, único). */
  code: string;
  kind: CouponKind;
  /** Porcentagem (10 = 10%) ou valor em R$; ignorado em `shipping`. */
  value: number;
  /** Teto do desconto em R$ no cupom de % ("10% até R$ 50"). */
  maxDiscount?: number;
  /** Subtotal mínimo dos produtos para valer. */
  minSubtotal?: number;
  /** Período (`aaaa-mm-dd`). Sem início = já vale; sem fim = até desativar ou esgotar. */
  startsOn?: string;
  endsOn?: string;
  /** Usos no total ("os primeiros 100"); sem = ilimitado. */
  maxUses?: number;
  /** Usos por cliente; sem = ilimitado. */
  perCustomer?: number;
  /** Só para quem ainda não comprou na loja. */
  firstPurchaseOnly: boolean;
  /** Desconta também de itens que já estão em promoção (padrão: não). */
  allowOnPromo: boolean;
  active: boolean;
  /** Usos até agora (pedidos criados com o cupom). */
  uses: number;
  /** Desconto total já dado (R$). */
  discountGiven: number;
}

export type CouponDraft = Omit<Coupon, 'id' | 'uses' | 'discountGiven'>;
