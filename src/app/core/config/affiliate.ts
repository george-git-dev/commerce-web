/**
 * Programa de afiliados — valores padrão (decididos 12/10: 5% de desconto, 5% de comissão, +10% em crédito na loja). Dá para ajustar a
 * comissão por afiliado no backoffice; o desconto vem do cupom dele.
 * Fase 2: vêm do back (`GET /affiliate-program`), não do código.
 */
export const AFFILIATE_PROGRAM = {
  /** Desconto (%) que o cupom do afiliado dá para quem compra. */
  buyerDiscountPercent: 5,
  /** Comissão (%) sobre os produtos do pedido, já com desconto e sem frete. */
  commissionPercent: 5,
  /**
   * Bônus (%) para quem recebe a comissão em crédito na loja em vez de Pix
   * (R$ 100 de comissão = R$ 110 em compras). Fixo, decidido 12/10.
   */
  storeCreditBonusPercent: 10,
  /** Validade do crédito na loja (meses). */
  storeCreditValidityMonths: 12,
  /** Valor mínimo (R$) acumulado para receber o Pix do mês (crédito na loja não tem mínimo). */
  minPayout: 50,
  /** Dias depois da entrega para a comissão ser liberada (arrependimento, CDC art. 49). */
  holdDays: 7,
} as const;

/** Onde a pessoa divulga (a principal). */
export const AFFILIATE_CHANNELS = ['Instagram', 'TikTok', 'YouTube', 'WhatsApp', 'Outro'] as const;
export type AffiliateChannel = (typeof AFFILIATE_CHANNELS)[number];
