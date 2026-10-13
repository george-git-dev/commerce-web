import { PaymentMethod } from './order';

/** Motivo da devolução. */
export type ReturnReason = 'arrependimento' | 'avariado' | 'defeito' | 'produto-errado';

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  arrependimento: 'Desisti da compra (até 7 dias da entrega)',
  avariado: 'Chegou quebrado, vazando ou amassado',
  defeito: 'Produto com defeito (ex.: válvula não borrifa)',
  'produto-errado': 'Recebi um produto diferente do pedido',
};

/** Foto enviada pelo cliente. Mock: só em memória; Fase 2: S3 privado + URL temporária. */
export interface ReturnPhoto {
  name: string;
  type: string;
  size: number;
  url: string;
}

/**
 * Solicitada (cliente pediu) → Aprovada (aguardando o produto voltar) →
 * Concluída (recebido + estorno feito). Ou Recusada (com motivo).
 */
export type ReturnStatus = 'solicitada' | 'aprovada' | 'recusada' | 'concluida';

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  solicitada: 'Solicitada',
  aprovada: 'Aprovada · aguardando o produto',
  recusada: 'Recusada',
  concluida: 'Concluída',
};

/** Item devolvido (snapshot do pedido, como o back grava). */
export interface ReturnItem {
  itemId: string;
  /** Variante (base do estoque). */
  sku?: string;
  name: string;
  variant: string;
  image?: string;
  quantity: number;
  unitPrice: number;
}

/** Quanto de cada item voltou ao estoque (o resto: aberto/avariado, vira perda). */
export interface ReturnReceipt {
  itemId: string;
  restock: number;
}

/**
 * Devolução de um pedido entregue. Contrato do futuro `GET /me/returns`,
 * `POST /orders/{numero}/returns` e `/admin/returns`.
 */
export interface ReturnRequest {
  id: number;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  createdAt: Date;
  /** "Cliente" (pela loja) ou o nome de quem registrou no backoffice. */
  createdBy: string;
  reason: ReturnReason;
  description: string;
  /** Fotos (obrigatórias em avaria, defeito e produto errado). */
  photos?: readonly ReturnPhoto[];
  /** Desistência: o cliente confirmou que está lacrado, sem uso e na embalagem original. */
  sealedConfirmed?: boolean;
  items: readonly ReturnItem[];
  /** Devolveu o pedido inteiro (aí o frete também volta). */
  wholeOrder: boolean;
  /** Valor a estornar: itens com a parte do desconto + frete se for o pedido inteiro. */
  refundAmount: number;
  /** Parte do estorno que é frete (base da comissão = estorno − frete). */
  shippingRefund: number;
  payment: PaymentMethod;
  status: ReturnStatus;
  decision?: { by: string; at: Date; reason?: string };
  completion?: {
    by: string;
    at: Date;
    received: readonly ReturnReceipt[];
    note?: string;
  };
}
