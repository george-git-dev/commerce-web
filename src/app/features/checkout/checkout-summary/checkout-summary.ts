import { BreakpointObserver } from '@angular/cdk/layout';
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CartLine, CartStore } from '../../../core/services/cart-store';
import { OrderSummary } from '../../../core/services/order-summary';
import { effectivePrice, variantLabel } from '../../../core/utils/product-pricing';

/** Resumo do pedido: recolhido no celular (toque para abrir), aberto no desktop. */
@Component({
  selector: 'app-checkout-summary',
  imports: [CurrencyPipe],
  templateUrl: './checkout-summary.html',
  styleUrl: './checkout-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutSummary {
  protected readonly cart = inject(CartStore);
  protected readonly summary = inject(OrderSummary);
  protected readonly variantLabel = variantLabel;
  protected readonly lineTotal = (line: CartLine) => effectivePrice(line.variant) * line.quantity;
  protected readonly wide = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 900px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
}
