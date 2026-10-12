/** Situação da comissão para a tela (derivada da gravada + datas). */
export type CommissionStatus = 'pendente' | 'liberada' | 'paga' | 'cancelada';

/**
 * Comissão de um pedido feito com cupom de afiliado (snapshot do % na hora).
 * Contrato do futuro `GET /me/affiliate/commissions` e `/admin/affiliates/commissions`.
 * Não guarda nada de quem comprou — só o número do pedido.
 */
export interface Commission {
  id: number;
  affiliateEmail: string;
  couponCode: string;
  orderNumber: string;
  createdAt: Date;
  /** Base: produtos do pedido já com o desconto do cupom, sem frete. */
  base: number;
  percent: number;
  amount: number;
  /** Gravado: aberta (pendente/liberada pelo tempo), cancelada ou paga. */
  state: 'aberta' | 'cancelada' | 'paga';
  /** Data da entrega (a liberação conta a partir dela). */
  deliveredAt?: Date;
  payoutId?: number;
}

export type PayoutMethod = 'pix' | 'credito';

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  pix: 'Pix',
  credito: 'Crédito na loja',
};

/** Comprovante do Pix anexado pela loja (PDF ou imagem). Fase 2: S3 privado + URL temporária. */
export interface PayoutReceipt {
  name: string;
  type: string;
  size: number;
  /** Mock: URL local do arquivo (só nesta sessão). */
  url: string;
}

/** Pagamento das comissões liberadas de UM afiliado (feito pela equipe, um por vez). */
export interface Payout {
  id: number;
  affiliateEmail: string;
  affiliateName: string;
  createdAt: Date;
  method: PayoutMethod;
  /** Soma das comissões. */
  amount: number;
  /** O que a pessoa recebe: igual no Pix; com bônus no crédito na loja. */
  paidAmount: number;
  paidAt: Date;
  paidBy: string;
  /** Comprovante do Pix (obrigatório no Pix; crédito na loja não tem). */
  receipt?: PayoutReceipt;
  commissionIds: readonly number[];
}

/** Lançamento do crédito na loja (extrato). */
export interface CreditEntry {
  id: number;
  email: string;
  kind: 'comissao' | 'uso' | 'estorno';
  /** Positivo entra, negativo sai. */
  amount: number;
  at: Date;
  /** Só nas entradas por comissão. */
  expiresAt?: Date;
  orderNumber?: string;
  payoutId?: number;
}
