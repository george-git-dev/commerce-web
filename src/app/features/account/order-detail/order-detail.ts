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
  /** Item com o formulário de avaliação aberto (um por vez). */
  protected readonly reviewing = signal<string | null>(null);

  /** Etapas da linha do tempo, marcando até onde o pedido já chegou. */
  protected readonly timeline = computed(() => {
    const status = this.order()?.status;
    const current = ORDER_TIMELINE.findIndex((step) => step.status === status);
    const inHands = this.order()?.shipping.id === 'em-maos';
    return ORDER_TIMELINE.map((step, index) => ({
      ...step,
      // Entrega em mãos não tem transportadora: "Enviado" vira "Saiu para entrega".
      label: inHands && step.status === 'enviado' ? 'Saiu para entrega' : step.label,
      done: index <= current,
    }));
  });

  protected toggleReview(item: OrderItem): void {
    this.reviewing.update((current) => (current === item.id ? null : item.id));
  }
}
