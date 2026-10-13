import { CartActions } from '../../core/services/cart-actions';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FavoritesStore } from '../../core/services/favorites-store';
import { Product, ProductSelection } from '../../core/models/product';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ProductCard } from '../../shared/product-card/product-card';

/** `/favoritos`. Sempre reflete o `FavoritesStore` em memória — sem persistência. */
@Component({
  selector: 'app-favorites',
  imports: [EmptyState, ProductCard],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Favorites {
  protected readonly favorites = inject(FavoritesStore);
  private readonly cartActions = inject(CartActions);

  protected onAddToCart({ product, variant }: ProductSelection): void {
    this.cartActions.add(product, variant);
  }

  protected onToggleFavorite(product: Product): void {
    this.favorites.toggle(product);
  }
}
