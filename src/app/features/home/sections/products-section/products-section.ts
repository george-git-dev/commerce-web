import { CartActions } from '../../../../core/services/cart-actions';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FavoritesStore } from '../../../../core/services/favorites-store';
import { FavoriteAction } from '../../../../core/services/favorite-action';
import { Product, ProductSelection } from '../../../../core/models/product';
import { ProductCard } from '../../../../shared/product-card/product-card';

/**
 * Grade de produtos genérica, usada para "destaques" e "mais vendidos" da home
 * com dados diferentes — ver `home.ts`. Dado sempre mockado nesta fase.
 */
@Component({
  selector: 'app-products-section',
  imports: [ProductCard],
  templateUrl: './products-section.html',
  styleUrl: './products-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsSection {
  private readonly cartActions = inject(CartActions);
  private readonly favorites = inject(FavoritesStore);
  private readonly favoriteAction = inject(FavoriteAction);

  readonly sectionId = input<string>();
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly products = input.required<readonly Product[]>();

  protected readonly isFavorite = (product: Product): boolean =>
    this.favorites.isFavorite(product.id);

  protected onAddToCart({ product, variant }: ProductSelection): void {
    this.cartActions.add(product, variant);
  }

  protected onToggleFavorite(product: Product): void {
    this.favoriteAction.toggle(product);
  }
}
