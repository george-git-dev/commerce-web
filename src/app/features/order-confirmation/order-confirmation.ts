import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PAYMENT_METHOD_LABELS } from '../../core/models/order';
import { OrderService } from '../../core/services/order-service';
import { PixPayment } from '../../shared/pix-payment/pix-payment';

/** `/pedido/:numero` — confirmação depois do checkout. */
@Component({
  selector: 'app-order-confirmation',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, RouterLink, PixPayment],
  templateUrl: './order-confirmation.html',
  styleUrl: './order-confirmation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderConfirmation {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);
  private readonly paramMap = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly order = computed(() => this.orders.find(this.paramMap().get('numero')));
  protected readonly methodLabels = PAYMENT_METHOD_LABELS;
}
