import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CartStore } from '../../core/services/cart-store';
import { FavoritesStore } from '../../core/services/favorites-store';
import { Product } from '../../core/models/product';
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
  private readonly cart = inject(CartStore);
  private readonly snackBar = inject(MatSnackBar);

  protected onAddToCart(product: Product): void {
    this.cart.add(product);
    this.snackBar.open(`${product.name} foi adicionado ao carrinho.`, 'Fechar', { duration: 3000 });
  }

  protected onToggleFavorite(product: Product): void {
    this.favorites.toggle(product);
  }
}
