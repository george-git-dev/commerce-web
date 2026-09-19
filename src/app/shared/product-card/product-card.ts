import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { IMAGERY } from '../../core/config/imagery';
import { Product } from '../../core/models/product';
import { StarRating } from '../star-rating/star-rating';

/**
 * Componente de apresentação: não conhece carrinho, favoritos nem snackbar —
 * só emite a intenção para quem o hospeda decidir o efeito.
 */
@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, RouterLink, StarRating],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  readonly product = input.required<Product>();
  readonly favorite = input(false);

  readonly addToCart = output<Product>();
  readonly toggleFavorite = output<Product>();

  /** A API ainda não retorna imagem por produto — todo card usa a mesma foto de coleção. */
  protected readonly placeholderImage = IMAGERY.productPlaceholder;

  protected readonly discount = computed(() => {
    const item = this.product();
    return item.oldPrice ? Math.round((1 - item.finalPrice / item.oldPrice) * 100) : null;
  });
}
