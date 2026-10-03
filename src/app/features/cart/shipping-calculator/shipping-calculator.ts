import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  model,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ShippingOption } from '../../../core/models/shipping';
import {
  formatCep,
  isValidCep,
  onlyCepDigits,
  ShippingService,
} from '../../../core/services/shipping-service';

/**
 * Campo de CEP + opções de entrega. O CEP fica no `ShippingService` (vale para a
 * sessão); as opções e a escolha vêm do carrinho, que soma o frete ao total.
 */
@Component({
  selector: 'app-shipping-calculator',
  imports: [CurrencyPipe, MatButtonModule],
  templateUrl: './shipping-calculator.html',
  styleUrl: './shipping-calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShippingCalculator {
  private readonly shipping = inject(ShippingService);

  readonly options = input.required<readonly ShippingOption[]>();
  readonly selected = model<ShippingOption['id'] | null>(null);

  /** Texto do campo (com máscara); começa com o CEP já consultado na sessão. */
  protected readonly draft = linkedSignal(() => formatCep(this.shipping.cep()));
  protected readonly error = signal('');

  protected onInput(event: Event): void {
    const field = event.target as HTMLInputElement;
    const masked = formatCep(field.value);
    field.value = masked;
    this.draft.set(masked);
    this.error.set('');
  }

  protected calculate(event: Event): void {
    event.preventDefault();
    const digits = onlyCepDigits(this.draft());
    if (!isValidCep(digits)) {
      this.error.set('Digite um CEP válido, com 8 números.');
      return;
    }
    this.shipping.cep.set(digits);
  }
}
