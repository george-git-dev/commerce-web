import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Product } from '../../core/models/product';

/**
 * Componente de apresentação: não conhece carrinho nem snackbar, apenas emite a
 * intenção de compra para quem o hospeda.
 */
@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  readonly product = input.required<Product>();
  readonly addToCart = output<Product>();

  protected readonly stars = [1, 2, 3, 4, 5];
}
