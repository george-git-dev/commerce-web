import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { IMAGERY } from '../../../core/config/imagery';
import { CartLine } from '../../../core/services/cart-store';
import { effectivePrice, variantLabel } from '../../../core/utils/product-pricing';

@Component({
  selector: 'app-cart-line-item',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './cart-line-item.html',
  styleUrl: './cart-line-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartLineItem {
  readonly line = input.required<CartLine>();
  readonly quantityChange = output<number>();
  readonly remove = output<void>();

  protected readonly placeholderImage = IMAGERY.productPlaceholder;

  /** "Frasco 100 ml". */
  protected readonly label = computed(() => variantLabel(this.line().variant));
  protected readonly subtotal = computed(
    () => effectivePrice(this.line().variant) * this.line().quantity,
  );
  /** Não deixa passar do estoque do tamanho escolhido. */
  protected readonly atMax = computed(() => this.line().quantity >= this.line().variant.stock);
}
