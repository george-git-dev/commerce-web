import { computed, inject, Injectable } from '@angular/core';
import {
  RETURN_REASON_LABELS,
  RETURN_STATUS_LABELS,
  ReturnItem,
  ReturnReason,
  ReturnReceipt,
  ReturnRequest,
} from '../../../core/models/return-request';
import { AuthService } from '../../../core/services/auth-service';
import { CommissionService } from '../../../core/services/commission-service';
import { ReturnService } from '../../../core/services/return-service';
import {
  deadlineProblem,
  isWholeOrder,
  refundAmount,
  returnableQuantity,
  returnDraftProblems,
} from '../../../core/utils/return-rules';
import { AdminOrder } from '../data/admin-orders-mock';
import { AdminAudit } from './admin-audit';
import { AdminOrderStore } from './admin-order-store';
import { AdminStockStore } from './admin-stock-store';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const LINK = '/admin/pedidos/devolucoes';

/** Id do item do pedido do backoffice (mesmo formato do pedido da loja). */
export const adminItemId = (order: AdminOrder, index: number) => `${order.number}-${index + 1}`;

/**
 * Devoluções no backoffice: aprovar/recusar o pedido do cliente, registrar uma
 * devolução combinada pelo WhatsApp e concluir (produto recebido + estorno).
 * Ver: `orders:view`; agir: `orders:edit`. Tudo auditado.
 * Fase 2 (B7): `GET /admin/returns`, `POST /admin/returns/{id}/approve|reject|complete`
 * — o `complete` faz na mesma transação: estoque (só o que volta lacrado),
 * comissão do afiliado e estorno pelo gateway (idempotente).
 */
@Injectable({ providedIn: 'root' })
export class AdminReturns {
  private readonly returns = inject(ReturnService);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);
  private readonly orders = inject(AdminOrderStore);
  private readonly stock = inject(AdminStockStore);
  private readonly commissions = inject(CommissionService);

  readonly all = this.returns.all;
  readonly pendingCount = this.returns.pendingCount;
  readonly canEdit = computed(() => this.auth.can('orders:edit'));
  readonly reasonLabels = RETURN_REASON_LABELS;
  readonly statusLabels = RETURN_STATUS_LABELS;

  /** Devoluções de um pedido do backoffice. */
  ofOrder(orderNumber: string): ReturnRequest[] {
    return this.all().filter((r) => r.orderNumber === orderNumber);
  }

  approve(request: ReturnRequest): boolean {
    if (!this.canEdit() || request.status !== 'solicitada') return false;
    this.returns.update(request.id, {
      status: 'aprovada',
      decision: { by: this.who(), at: new Date() },
    });
    this.record('Aprovou devolução', request, [
      { field: 'Situação', before: 'Solicitada', after: 'Aprovada' },
    ]);
    return true;
  }

  refuse(request: ReturnRequest, reason: string): boolean {
    const text = reason.trim();
    if (!this.canEdit() || request.status !== 'solicitada' || text.length < 5) return false;
    this.returns.update(request.id, {
      status: 'recusada',
      decision: { by: this.who(), at: new Date(), reason: text },
    });
    this.record('Recusou devolução', request, [
      { field: 'Situação', before: 'Solicitada', after: 'Recusada' },
      { field: 'Motivo', before: '', after: text },
    ]);
    return true;
  }

  /** Problemas para concluir (lista vazia = pode). */
  completeProblems(request: ReturnRequest, received: readonly ReturnReceipt[], refunded: boolean) {
    const problems: string[] = [];
    if (request.status !== 'aprovada') problems.push('Só devolução aprovada pode ser concluída.');
    for (const item of request.items) {
      const restock = received.find((r) => r.itemId === item.itemId)?.restock ?? 0;
      if (restock < 0 || restock > item.quantity)
        problems.push(`Quantidade inválida: ${item.name}.`);
    }
    if (!refunded) problems.push(`Confirme o estorno de ${brl(request.refundAmount)}.`);
    return problems;
  }

  /**
   * Produto chegou e o estorno foi feito: o que voltou lacrado entra no estoque
   * ("Devolução de cliente"); o resto fica registrado como perda. A comissão do
   * afiliado cai na proporção do devolvido e o painel desconta o estorno.
   */
  complete(
    request: ReturnRequest,
    received: readonly ReturnReceipt[],
    refunded: boolean,
    note = '',
  ): boolean {
    if (!this.canEdit() || this.completeProblems(request, received, refunded).length) return false;
    for (const item of request.items) {
      const restock = received.find((r) => r.itemId === item.itemId)?.restock ?? 0;
      if (restock > 0 && item.sku && this.stock.row(item.sku)) {
        this.stock.adjust(
          item.sku,
          'entrada',
          restock,
          'Devolução de cliente',
          `Pedido ${request.orderNumber}`,
        );
      }
    }
    this.commissions.returnFromOrder(
      request.orderNumber,
      Math.round((request.refundAmount - request.shippingRefund) * 100) / 100,
    );
    this.orders.addRefund(request.orderNumber, request.refundAmount);
    this.returns.update(request.id, {
      status: 'concluida',
      completion: { by: this.who(), at: new Date(), received, note: note.trim() || undefined },
    });
    const lost = request.items
      .map((i) => ({
        ...i,
        lost: i.quantity - (received.find((r) => r.itemId === i.itemId)?.restock ?? 0),
      }))
      .filter((i) => i.lost > 0);
    this.record('Concluiu devolução', request, [
      { field: 'Situação', before: 'Aprovada', after: 'Concluída' },
      { field: 'Estorno', before: '', after: brl(request.refundAmount) },
      ...(lost.length
        ? [
            {
              field: 'Não voltou ao estoque',
              before: '',
              after: lost.map((i) => `${i.lost}× ${i.name}`).join(', '),
            },
          ]
        : []),
    ]);
    return true;
  }

  /** Itens do pedido do backoffice que ainda podem ser devolvidos. */
  returnable(order: AdminOrder) {
    const previous = this.ofOrder(order.number);
    return order.items.map((item, index) => {
      const id = adminItemId(order, index);
      return { id, item, max: returnableQuantity({ id, quantity: item.quantity }, previous) };
    });
  }

  /** Data de entrega do pedido do backoffice (do histórico). */
  deliveredAt(order: AdminOrder): Date | undefined {
    return order.history.find((event) => event.status === 'entregue')?.at;
  }

  /** Aviso (não trava): fora do prazo do CDC — a loja pode aceitar mesmo assim. */
  lateWarning(order: AdminOrder, reason: ReturnReason | null): string | null {
    return reason ? deadlineProblem(this.deliveredAt(order), reason) : null;
  }

  registerProblems(
    order: AdminOrder,
    chosen: readonly { itemId: string; quantity: number }[],
    reason: ReturnReason | null,
    description: string,
  ): string[] {
    if (order.status !== 'entregue') return ['Só pedido entregue pode ter devolução.'];
    if (
      this.ofOrder(order.number).some((r) => r.status === 'solicitada' || r.status === 'aprovada')
    )
      return ['Já existe uma devolução em andamento para este pedido.'];
    const lines = this.returnable(order).map((line) => ({
      quantity: chosen.find((c) => c.itemId === line.id)?.quantity ?? 0,
      max: line.max,
    }));
    return returnDraftProblems({ items: lines, reason, description, byStaff: true });
  }

  /**
   * Devolução combinada com o cliente (WhatsApp): já nasce aprovada, esperando
   * o produto. Fora do prazo do CDC é permitido (decisão da loja), com aviso.
   */
  register(
    order: AdminOrder,
    chosen: readonly { itemId: string; quantity: number }[],
    reason: ReturnReason,
    description: string,
  ): ReturnRequest | null {
    if (!this.canEdit() || this.registerProblems(order, chosen, reason, description).length)
      return null;
    const previous = this.ofOrder(order.number);
    const items: ReturnItem[] = this.returnable(order)
      .map((line) => ({ line, quantity: chosen.find((c) => c.itemId === line.id)?.quantity ?? 0 }))
      .filter(({ quantity }) => quantity > 0)
      .map(({ line, quantity }) => ({
        itemId: line.id,
        sku: line.item.sku,
        name: line.item.name,
        variant: line.item.variant,
        image: line.item.image,
        quantity,
        unitPrice: line.item.unitPrice,
      }));
    const whole = isWholeOrder(
      this.returnable(order).map((l) => ({ id: l.id, quantity: l.item.quantity })),
      items,
      previous,
    );
    const money = {
      subtotal: order.subtotal,
      discount: order.coupon?.discount ?? 0,
      shippingPrice: order.shippingPrice,
    };
    const created = this.returns.add({
      orderNumber: order.number,
      customerEmail: order.customer.email,
      customerName: order.customer.name,
      createdAt: new Date(),
      createdBy: this.who(),
      reason,
      description: description.trim(),
      items,
      wholeOrder: whole,
      refundAmount: refundAmount(items, money, whole),
      shippingRefund: whole ? order.shippingPrice : 0,
      payment: order.payment,
      status: 'aprovada',
      decision: { by: this.who(), at: new Date() },
    });
    this.record('Registrou devolução', created, [
      {
        field: 'Itens',
        before: '',
        after: items.map((i) => `${i.quantity}× ${i.name}`).join(', '),
      },
      { field: 'Motivo', before: '', after: RETURN_REASON_LABELS[reason] },
      { field: 'Estorno previsto', before: '', after: brl(created.refundAmount) },
    ]);
    return created;
  }

  private record(
    action: string,
    request: ReturnRequest,
    changes: { field: string; before: string; after: string }[],
  ): void {
    this.audit.record({
      by: this.who(),
      action,
      entity: 'Devolução',
      entityId: request.orderNumber,
      link: LINK,
      changes,
    });
  }

  private who(): string {
    return this.auth.user()?.name ?? 'Equipe';
  }
}
