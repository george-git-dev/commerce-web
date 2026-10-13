import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { STORE_CONFIG } from '../../../core/config/store-config';
import { ORDER_TIMELINE, OrderItem, PAYMENT_METHOD_LABELS } from '../../../core/models/order';
import { OrderService } from '../../../core/services/order-service';
import { ReviewService } from '../../../core/services/review-service';
import { ReturnService } from '../../../core/services/return-service';
import { RETURN_REASON_LABELS, RETURN_STATUS_LABELS } from '../../../core/models/return-request';
import {
  canReview,
  canStillReturn,
  returnableQuantity,
  reviewOpensAt,
} from '../../../core/utils/return-rules';
import { OrderStatusChip } from '../../../shared/order-status/order-status';
import { PixPayment } from '../../../shared/pix-payment/pix-payment';
import { ReviewForm } from './review-form/review-form';

/** `/minha-conta/pedidos/:numero` — detalhe, status e avaliação dos itens. */
@Component({
  selector: 'app-order-detail',
  imports: [
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    OrderStatusChip,
    PixPayment,
    ReviewForm,
  ],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);
  protected readonly reviews = inject(ReviewService);
  private readonly paramMap = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly order = computed(() => this.orders.find(this.paramMap().get('numero')));
  protected readonly methodLabels = PAYMENT_METHOD_LABELS;
  protected readonly store = STORE_CONFIG;
  private readonly returnService = inject(ReturnService);
  protected readonly returnReasons = RETURN_REASON_LABELS;
  protected readonly returnStatuses = RETURN_STATUS_LABELS;

  /** Devoluções deste pedido (a mais recente primeiro). */
  protected readonly returns = computed(() => {
    const order = this.order();
    return order ? this.returnService.forOrder(order.number) : [];
  });

  /**
   * Avaliar só depois do prazo de desistência (7 dias da entrega) e sem
   * devolução em andamento. Devolve o aviso para o cliente, ou `null` = pode.
   */
  protected readonly reviewWait = computed(() => {
    const order = this.order();
    if (!order) return null;
    if (this.returnService.openFor(order.number))
      return 'Você poderá avaliar quando a devolução for finalizada.';
    const delivered = order.deliveredAt ? new Date(order.deliveredAt) : undefined;
    if (canReview(delivered)) return null;
    const opens = reviewOpensAt(delivered)!;
    return `Você poderá avaliar a partir de ${opens.toLocaleDateString('pt-BR')}, depois do prazo de devolução.`;
  });

  /** Pode pedir devolução: entregue, no prazo, sem outra em andamento e com item a devolver. */
  protected readonly canReturn = computed(() => {
    const order = this.order();
    if (!order || order.status !== 'entregue') return false;
    if (this.returnService.openFor(order.number)) return false;
    if (!canStillReturn(order.deliveredAt ? new Date(order.deliveredAt) : undefined)) return false;
    return order.items.some((item) => returnableQuantity(item, this.returns()) > 0);
  });
  /** Item com o formulário de avaliação aberto (um por vez). */
  protected readonly reviewing = signal<string | null>(null);

  /** Etapas da linha do tempo, marcando até onde o pedido já chegou. */
  protected readonly timeline = computed(() => {
    const status = this.order()?.status;
    const inHands = this.order()?.shipping.id === 'em-maos';
    // Entrega em mãos não é enviada: "Pronto para entrega" e depois "Entregue".
    const steps = inHands
      ? ORDER_TIMELINE.filter((step) => step.status !== 'enviado').map((step) =>
          step.status === 'pronto-envio' ? { ...step, label: 'Pronto para entrega' } : step,
        )
      : ORDER_TIMELINE;
    const current = steps.findIndex(
      (step) => step.status === (inHands && status === 'enviado' ? 'pronto-envio' : status),
    );
    return steps.map((step, index) => ({ ...step, done: index <= current }));
  });

  protected toggleReview(item: OrderItem): void {
    this.reviewing.update((current) => (current === item.id ? null : item.id));
  }
}
