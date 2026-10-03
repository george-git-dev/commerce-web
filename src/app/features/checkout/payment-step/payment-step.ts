import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { STORE_CONFIG } from '../../../core/config/store-config';
import { PaymentMethod } from '../../../core/models/order';
import { OrderSummary } from '../../../core/services/order-summary';
import { cardBrand } from '../../../core/utils/br-format';
import { InputMask } from '../../../shared/input-mask/input-mask';
import { CheckoutState } from '../checkout-state';

type PaymentField = keyof CheckoutState['payment']['controls'];

/** Passo 2: CPF e forma de pagamento (Pix, cartão ou boleto). */
@Component({
  selector: 'app-payment-step',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, ReactiveFormsModule, InputMask],
  templateUrl: './payment-step.html',
  styleUrl: './payment-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentStep {
  private readonly state = inject(CheckoutState);
  private readonly summary = inject(OrderSummary);

  protected readonly form = this.state.payment;
  protected readonly config = STORE_CONFIG;
  protected readonly method = toSignal(this.form.controls.method.valueChanges, {
    initialValue: this.form.controls.method.value,
  });
  private readonly cardNumber = toSignal(this.form.controls.cardNumber.valueChanges, {
    initialValue: this.form.controls.cardNumber.value,
  });
  protected readonly brand = computed(() => cardBrand(this.cardNumber()));

  protected readonly methods: readonly {
    id: PaymentMethod;
    icon: string;
    title: string;
    text: string;
  }[] = [
    {
      id: 'pix',
      icon: 'qr_code_2',
      title: 'Pix',
      text: 'Aprovação na hora. O código vale por 30 minutos.',
    },
    {
      id: 'cartao',
      icon: 'credit_card',
      title: 'Cartão de crédito',
      text: `Em até ${STORE_CONFIG.maxInstallments}x sem juros.`,
    },
    {
      id: 'boleto',
      icon: 'receipt_long',
      title: 'Boleto',
      text: 'Vence em 3 dias úteis. O pedido segue após a compensação.',
    },
  ];

  /** Parcelas possíveis: até o máximo, sem passar do valor mínimo por parcela. */
  protected readonly installments = computed(() => {
    const total = this.summary.total();
    const options = [];
    for (let n = 1; n <= STORE_CONFIG.maxInstallments; n++) {
      if (n === 1 || total / n >= STORE_CONFIG.minInstallmentValue) {
        options.push({ count: n, value: total / n });
      }
    }
    return options;
  });

  protected invalid(field: PaymentField): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  protected back(): void {
    this.state.goTo(1);
  }

  protected next(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.state.goTo(3);
  }
}
