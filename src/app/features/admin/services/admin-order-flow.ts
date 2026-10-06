import { OrderStatus } from '../../../core/models/order';
import { AdminOrder } from '../data/admin-orders-mock';

/**
 * Regras de status do pedido no backoffice (o back aplica as mesmas — B7).
 * - "Aguardando pagamento" → "Pago" só pelo gateway (webhook), nunca à mão.
 * - Separação → envio exige código de rastreio (menos na entrega em mãos).
 * - Cancelar só antes de sair (depois disso é troca/devolução).
 */
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pago: 'em-separacao',
  'em-separacao': 'enviado',
  enviado: 'entregue',
};

export function nextStatus(order: AdminOrder): OrderStatus | null {
  return NEXT[order.status] ?? null;
}

export function canCancel(order: AdminOrder): boolean {
  return ['aguardando-pagamento', 'pago', 'em-separacao'].includes(order.status);
}

/** Envio pela transportadora pede rastreio; entrega em mãos não. */
export function needsTracking(order: AdminOrder): boolean {
  return order.status === 'em-separacao' && order.shipping !== 'em-maos';
}

/** Código de rastreio: 8 a 30 letras/números (Correios: AA123456789BR). */
export function isValidTracking(code: string): boolean {
  return /^[A-Z0-9]{8,30}$/.test(code.trim().toUpperCase());
}

/** Nome do status no admin: na entrega em mãos, "Enviado" é "Pronto para entrega". */
export function statusLabel(status: OrderStatus, shipping: AdminOrder['shipping']): string {
  if (status === 'enviado' && shipping === 'em-maos') return 'Pronto para entrega';
  return (
    {
      'aguardando-pagamento': 'Aguardando pagamento',
      pago: 'Pago',
      'em-separacao': 'Em separação',
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
  if (next === 'enviado')
    return order.shipping === 'em-maos' ? 'Pronto para entrega' : 'Marcar como enviado';
  return 'Marcar como entregue';
}
