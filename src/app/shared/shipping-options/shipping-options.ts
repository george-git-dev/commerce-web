import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { ShippingOption } from '../../core/models/shipping';

/** Lista de opções de entrega (rádio). Usada no carrinho e no checkout. */
@Component({
  selector: 'app-shipping-options',
  imports: [CurrencyPipe],
  templateUrl: './shipping-options.html',
  styleUrl: './shipping-options.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShippingOptions {
  readonly options = input.required<readonly ShippingOption[]>();
  readonly selected = model<ShippingOption['id'] | null>(null);
  /** Frete zerado por cupom: mostra "Grátis" em todas. */
  readonly allFree = input(false);
}
