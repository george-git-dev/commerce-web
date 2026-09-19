import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CartStore } from '../../../../core/services/cart-store';
import { FavoritesStore } from '../../../../core/services/favorites-store';
import { Product } from '../../../../core/models/product';
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
  private readonly cart = inject(CartStore);
  private readonly favorites = inject(FavoritesStore);
  private readonly snackBar = inject(MatSnackBar);

  readonly sectionId = input<string>();
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly products = input.required<readonly Product[]>();

  protected readonly isFavorite = (product: Product): boolean =>
    this.favorites.isFavorite(product.id);

  protected onAddToCart(product: Product): void {
    this.cart.add(product);
    this.snackBar.open(`${product.name} foi adicionado ao carrinho.`, 'Fechar', {
      duration: 3000,
    });
  }

  protected onToggleFavorite(product: Product): void {
    this.favorites.toggle(product);
  }
}
