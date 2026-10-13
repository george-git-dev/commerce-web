import { computed, inject, Injectable, signal } from '@angular/core';
import { ActionResult } from '../models/auth';
import { Order } from '../models/order';
import { ReturnPhoto, ReturnReason, ReturnRequest } from '../models/return-request';
import { photoProblem } from '../utils/return-rules';
import {
  deadlineProblem,
  isWholeOrder,
  refundAmount,
  returnableQuantity,
  returnDraftProblems,
} from '../utils/return-rules';
import { AuthService } from './auth-service';

export interface ReturnDraft {
  items: readonly { itemId: string; quantity: number }[];
  reason: ReturnReason | null;
  description: string;
  photos?: readonly ReturnPhoto[];
  sealedConfirmed?: boolean;
}

const DAY = 86_400_000;

/**
 * Devoluções (mock em memória). O cliente pede em Meus pedidos; a loja aprova,
 * recebe o produto e faz o estorno no backoffice (`AdminReturns`).
 * Fase 2: `POST /orders/{numero}/returns`, `GET /me/returns`, `/admin/returns`.
 */
@Injectable({ providedIn: 'root' })
export class ReturnService {
  private readonly auth = inject(AuthService);
  private readonly state = signal<readonly ReturnRequest[]>([
    // Exemplo para o backoffice: a Ana pediu devolução do pedido de exemplo NP100238.
    {
      id: 1,
      orderNumber: 'NP100238',
      customerEmail: 'ana@email.com',
      customerName: 'Ana Beatriz Costa',
      createdAt: new Date(Date.now() - 0.5 * DAY),
      createdBy: 'Cliente',
      reason: 'defeito',
      description: 'A válvula do frasco não borrifa, o perfume sai em gotas.',
      photos: [
        {
          name: 'valvula.webp',
          type: 'image/webp',
          size: 48_000,
          url: 'img/produtos/garrafa-preta.webp',
        },
      ],
      items: [
        {
          itemId: 'NP100238-1',
          sku: 'lattafa-fakhar-black-100',
          name: 'Fakhar Black',
          variant: 'Frasco 100 ml',
          quantity: 1,
          unitPrice: 249.9,
        },
      ],
      wholeOrder: true,
      refundAmount: 249.9,
      shippingRefund: 0,
      payment: 'pix',
      status: 'solicitada',
    },
  ]);

  readonly all = this.state.asReadonly();
  readonly pendingCount = computed(
    () => this.state().filter((r) => r.status === 'solicitada').length,
  );

  /** Devoluções de um pedido da conta (mais recentes primeiro). */
  forOrder(orderNumber: string, email = this.auth.user()?.email ?? ''): ReturnRequest[] {
    return this.state()
      .filter((r) => r.orderNumber === orderNumber && r.customerEmail === email)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /** Há devolução em andamento (solicitada ou aprovada) para o pedido? */
  openFor(orderNumber: string, email?: string): ReturnRequest | undefined {
    return this.forOrder(orderNumber, email).find(
      (r) => r.status === 'solicitada' || r.status === 'aprovada',
    );
  }

  /** Cliente pede a devolução de um pedido entregue. */
  request(order: Order, draft: ReturnDraft, now = new Date()): ActionResult {
    const user = this.auth.user();
    if (!user) return { ok: false, message: 'Entre na sua conta.' };
    if (order.status !== 'entregue')
      return { ok: false, message: 'Só dá para pedir devolução de pedido entregue.' };
    if (this.openFor(order.number))
      return { ok: false, message: 'Já existe uma devolução em andamento para este pedido.' };
    const previous = this.forOrder(order.number);
    const items = order.items.map((item) => ({
      item,
      quantity: draft.items.find((c) => c.itemId === item.id)?.quantity ?? 0,
      max: returnableQuantity(item, previous),
    }));
    const problems = returnDraftProblems({
      items,
      reason: draft.reason,
      description: draft.description,
      photos: draft.photos?.length ?? 0,
      sealedConfirmed: draft.sealedConfirmed,
    });
    const badPhoto = (draft.photos ?? []).map(photoProblem).find(Boolean);
    if (badPhoto) problems.push(badPhoto);
    if (problems.length) return { ok: false, message: problems[0] };
    const late = deadlineProblem(
      order.deliveredAt ? new Date(order.deliveredAt) : undefined,
      draft.reason!,
      now,
    );
    if (late) return { ok: false, message: late };

    const chosen = items
      .filter((i) => i.quantity > 0)
      .map(({ item, quantity }) => ({
        itemId: item.id,
        sku: item.sku,
        name: item.productName,
        variant: item.variantLabel,
        image: item.image,
        quantity,
        unitPrice: item.unitPrice,
      }));
    const whole = isWholeOrder(order.items, chosen, previous);
    this.add({
      orderNumber: order.number,
      customerEmail: user.email,
      customerName: user.name,
      createdAt: now,
      createdBy: 'Cliente',
      reason: draft.reason!,
      description: draft.description.trim(),
      photos: draft.reason === 'arrependimento' ? undefined : draft.photos,
      sealedConfirmed: draft.reason === 'arrependimento' ? true : undefined,
      items: chosen,
      wholeOrder: whole,
      refundAmount: refundAmount(chosen, order, whole),
      shippingRefund: whole ? order.shippingPrice : 0,
      payment: order.payment.method,
      status: 'solicitada',
    });
    return { ok: true };
  }

  /** Grava uma devolução nova (o backoffice valida e audita antes). */
  add(request: Omit<ReturnRequest, 'id'>): ReturnRequest {
    const created = { ...request, id: Math.max(0, ...this.state().map((r) => r.id)) + 1 };
    this.state.update((list) => [created, ...list]);
    return created;
  }

  update(id: number, change: Partial<Pick<ReturnRequest, 'status' | 'decision' | 'completion'>>) {
    this.state.update((list) => list.map((r) => (r.id === id ? { ...r, ...change } : r)));
    return this.state().find((r) => r.id === id);
  }
}
