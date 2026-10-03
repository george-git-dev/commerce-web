import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CheckoutState } from './checkout-state';
import { CheckoutSummary } from './checkout-summary/checkout-summary';
import { DeliveryStep } from './delivery-step/delivery-step';
import { PaymentStep } from './payment-step/payment-step';
import { ReviewStep } from './review-step/review-step';

/**
 * `/finalizar-compra` — 3 passos (Entrega → Pagamento → Revisão).
 * Exige login e sacola com itens (guards na rota).
 */
@Component({
  selector: 'app-checkout',
  imports: [MatIconModule, CheckoutSummary, DeliveryStep, PaymentStep, ReviewStep],
  providers: [CheckoutState],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checkout {
  protected readonly state = inject(CheckoutState);
  protected readonly steps = [
    { id: 1, label: 'Entrega' },
    { id: 2, label: 'Pagamento' },
    { id: 3, label: 'Revisão' },
  ] as const;
}
