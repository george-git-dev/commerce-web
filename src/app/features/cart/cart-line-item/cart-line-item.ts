import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { IMAGERY } from '../../../core/config/imagery';
import { CartLine } from '../../../core/services/cart-store';

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
}
