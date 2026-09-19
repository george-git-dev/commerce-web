import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IMAGERY } from '../../core/config/imagery';
import { MOCK_PRODUCTS } from '../../core/data/mock-products';
import { CartStore } from '../../core/services/cart-store';
import { FavoritesStore } from '../../core/services/favorites-store';
import { Product } from '../../core/models/product';
import { ProductCard } from '../../shared/product-card/product-card';
import { StarRating } from '../../shared/star-rating/star-rating';

/** `/produtos/:id`. Dado mockado — a mesma foto de coleção cobre as 4 miniaturas. */
@Component({
  selector: 'app-product-detail',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, RouterLink, ProductCard, StarRating],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cart = inject(CartStore);
  private readonly favorites = inject(FavoritesStore);
  private readonly snackBar = inject(MatSnackBar);

  private readonly paramMap = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly imagery = IMAGERY;
  protected readonly thumbnails = [0, 1, 2, 3];

  protected readonly product = computed<Product | undefined>(() => {
    const id = Number(this.paramMap().get('id'));
    return MOCK_PRODUCTS.find((item) => item.id === id);
  });

  protected readonly installment = computed(() => (this.product()?.finalPrice ?? 0) / 6);

  protected readonly related = computed<readonly Product[]>(() => {
    const current = this.product();
    if (!current) return [];
    return MOCK_PRODUCTS.filter(
      (item) => item.id !== current.id && item.gender === current.gender,
    ).slice(0, 4);
  });

  protected readonly isFavorite = (product: Product): boolean =>
    this.favorites.isFavorite(product.id);

  protected addToCart(product: Product, quantity = 1): void {
    this.cart.add(product, quantity);
    this.snackBar.open(`${product.name} foi adicionado ao carrinho.`, 'Fechar', { duration: 3000 });
  }

  protected buyNow(product: Product): void {
    this.cart.add(product);
    this.router.navigate(['/carrinho']);
  }

  protected toggleFavorite(product: Product): void {
    this.favorites.toggle(product);
  }
}
