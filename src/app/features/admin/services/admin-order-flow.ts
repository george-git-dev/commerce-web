import { OrderStatus } from '../../../core/models/order';
import { AdminOrder } from '../data/admin-orders-mock';

/**
 * Regras de status do pedido no backoffice (o back aplica as mesmas — B7).
 * Aguardando pagamento → Pagamento confirmado → Em separação → Pronto para envio
 * → Enviado → Entregue. Entrega em mãos: Pronto para entrega → Entregue (sem envio).
 * - "Pagamento confirmado" só pelo gateway (webhook), nunca à mão.
 * - Marcar como enviado exige código de rastreio (menos na entrega em mãos).
 * - Cancelar só antes de sair (depois disso é troca/devolução).
 */
export function nextStatus(order: AdminOrder): OrderStatus | null {
  switch (order.status) {
    case 'pago':
      return 'em-separacao';
    case 'em-separacao':
      return 'pronto-envio';
    case 'pronto-envio':
      return order.shipping === 'em-maos' ? 'entregue' : 'enviado';
    case 'enviado':
      return 'entregue';
    default:
      return null;
  }
}

export function canCancel(order: AdminOrder): boolean {
  return ['aguardando-pagamento', 'pago', 'em-separacao', 'pronto-envio'].includes(order.status);
}

/** Marcar como enviado pede o rastreio; entrega em mãos não é enviada. */
export function needsTracking(order: AdminOrder): boolean {
  return order.status === 'pronto-envio' && order.shipping !== 'em-maos';
}

/** Valor que ficou com a loja: total menos o estornado em devoluções. */
export function netTotal(order: Pick<AdminOrder, 'total' | 'refunded'>): number {
  return Math.round((order.total - (order.refunded ?? 0)) * 100) / 100;
}

/** Código de rastreio: 8 a 30 letras/números (Correios: AA123456789BR). */
export function isValidTracking(code: string): boolean {
  return /^[A-Z0-9]{8,30}$/.test(code.trim().toUpperCase());
}

/** Nome do status no admin (na entrega em mãos, "Pronto para entrega"). */
export function statusLabel(status: OrderStatus, shipping: AdminOrder['shipping']): string {
  if (status === 'pronto-envio' && shipping === 'em-maos') return 'Pronto para entrega';
  // Pedidos antigos de entrega em mãos que passaram por "enviado".
  if (status === 'enviado' && shipping === 'em-maos') return 'Pronto para entrega';
  return (
    {
      'aguardando-pagamento': 'Aguardando pagamento',
      pago: 'Pagamento confirmado',
      'em-separacao': 'Em separação',
      'pronto-envio': 'Pronto para envio',
      enviado: 'Enviado',
      entregue: 'Entregue',
      cancelado: 'Cancelado',
    } satisfies Record<OrderStatus, string>
  )[status];
}

/** Texto do botão que avança o pedido. */
export function advanceLabel(order: AdminOrder): string | null {
  const next = nextStatus(order);
  if (!next) return null;
  if (next === 'em-separacao') return 'Iniciar separação';
  if (next === 'pronto-envio')
    return order.shipping === 'em-maos' ? 'Pronto para entrega' : 'Pronto para envio';
  if (next === 'enviado') return 'Marcar como enviado';
  return 'Marcar como entregue';
}
