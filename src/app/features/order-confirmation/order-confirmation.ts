import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PAYMENT_METHOD_LABELS } from '../../core/models/order';
import { OrderService } from '../../core/services/order-service';

/** Código Pix "copia e cola" FICTÍCIO — na Fase 2 vem do gateway. */
const FAKE_PIX_CODE =
  '00020126580014BR.GOV.BCB.PIX0136nani-perfumes-exemplo-nao-pague5204000053039865802BR5913NANI PERFUMES6009SAO PAULO6304ABCD';

/** `/pedido/:numero` — confirmação depois do checkout. */
@Component({
  selector: 'app-order-confirmation',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, RouterLink],
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
  protected readonly pixCode = FAKE_PIX_CODE;
  protected readonly copied = signal(false);

  protected async copyPix(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.pixCode);
      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
  }
}
