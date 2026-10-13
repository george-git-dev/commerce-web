import { ReturnItem, ReturnReason, ReturnRequest } from '../models/return-request';

const DAY = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Prazos (CDC): arrependimento em compra online = 7 dias da entrega (art. 49);
 * vício em produto não durável (perfume) = 30 dias (art. 26, I).
 */
export const RETURN_DEADLINE_DAYS: Record<ReturnReason, number> = {
  arrependimento: 7,
  defeito: 30,
  'produto-errado': 30,
};

export const RETURN_DESCRIPTION_MIN = 10;
export const RETURN_DESCRIPTION_MAX = 500;

/** Último dia para pedir a devolução por este motivo. */
export function returnDeadline(deliveredAt: Date, reason: ReturnReason): Date {
  return new Date(deliveredAt.getTime() + RETURN_DEADLINE_DAYS[reason] * DAY);
}

/**
 * Avaliação só depois do prazo de desistência (7 dias da entrega): quem ainda
 * pode devolver não avalia. Sem data de entrega (pedido antigo): libera.
 */
export function reviewOpensAt(deliveredAt: Date | undefined): Date | null {
  return deliveredAt ? returnDeadline(deliveredAt, 'arrependimento') : null;
}

export function canReview(deliveredAt: Date | undefined, now = new Date()): boolean {
  const opens = reviewOpensAt(deliveredAt);
  return !opens || now > opens;
}

/** Ainda dá para pedir por algum motivo? (o maior prazo é o de defeito). */
export function canStillReturn(deliveredAt: Date | undefined, now = new Date()): boolean {
  return !!deliveredAt && now <= returnDeadline(deliveredAt, 'defeito');
}

/** Prazo vencido para o motivo (texto para o cliente) ou `null`. */
export function deadlineProblem(
  deliveredAt: Date | undefined,
  reason: ReturnReason,
  now = new Date(),
): string | null {
  if (!deliveredAt) return 'Só dá para pedir devolução de pedido entregue.';
  if (now > returnDeadline(deliveredAt, reason)) {
    return reason === 'arrependimento'
      ? 'O prazo para desistir da compra (7 dias da entrega) já passou.'
      : 'O prazo para devolução por defeito ou produto errado (30 dias da entrega) já passou.';
  }
  return null;
}

/** Devoluções que ainda contam (não recusadas). */
export function activeReturns(list: readonly ReturnRequest[]): ReturnRequest[] {
  return list.filter((r) => r.status !== 'recusada');
}

/** Quantas unidades de cada item ainda podem ser devolvidas. */
export function returnableQuantity(
  item: { id: string; quantity: number },
  previous: readonly ReturnRequest[],
): number {
  const used = activeReturns(previous)
    .flatMap((r) => r.items)
    .filter((i) => i.itemId === item.id)
    .reduce((sum, i) => sum + i.quantity, 0);
  return Math.max(0, item.quantity - used);
}

/**
 * Valor a estornar: itens devolvidos com a parte proporcional do desconto do
 * pedido; pedido inteiro devolvido = frete também volta (CDC, art. 49).
 */
export function refundAmount(
  items: readonly Pick<ReturnItem, 'quantity' | 'unitPrice'>[],
  order: { subtotal: number; discount: number; shippingPrice: number },
  wholeOrder: boolean,
): number {
  const value = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const share = order.subtotal ? (order.discount * value) / order.subtotal : 0;
  return round2(value - share + (wholeOrder ? order.shippingPrice : 0));
}

/** Os itens escolhidos são o pedido todo (contando devoluções anteriores)? */
export function isWholeOrder(
  orderItems: readonly { id: string; quantity: number }[],
  chosen: readonly { itemId: string; quantity: number }[],
  previous: readonly ReturnRequest[],
): boolean {
  return (
    activeReturns(previous).length === 0 &&
    orderItems.every((item) => chosen.find((c) => c.itemId === item.id)?.quantity === item.quantity)
  );
}

/** Problemas do pedido de devolução (lista vazia = pode enviar). */
export function returnDraftProblems(draft: {
  items: readonly { quantity: number; max: number }[];
  reason: ReturnReason | null;
  description: string;
}): string[] {
  const problems: string[] = [];
  const chosen = draft.items.filter((i) => i.quantity > 0);
  if (!chosen.length) problems.push('Escolha pelo menos um item.');
  if (draft.items.some((i) => i.quantity > i.max || i.quantity < 0)) {
    problems.push('Quantidade maior do que a que pode ser devolvida.');
  }
  if (!draft.reason) problems.push('Escolha o motivo.');
  const text = draft.description.trim();
  if (draft.reason && draft.reason !== 'arrependimento' && text.length < RETURN_DESCRIPTION_MIN) {
    problems.push(`Conte o que aconteceu (mínimo ${RETURN_DESCRIPTION_MIN} caracteres).`);
  }
  if (text.length > RETURN_DESCRIPTION_MAX) {
    problems.push(`Use no máximo ${RETURN_DESCRIPTION_MAX} caracteres.`);
  }
  return problems;
}
