import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CATALOG_QUERY_PARAMS } from '../../core/config/navigation';
import { Product, ProductSelection, ProductVariant, VariantKind } from '../../core/models/product';
import { CartStore } from '../../core/services/cart-store';
import { CatalogService } from '../../core/services/catalog-service';
import { FavoritesStore } from '../../core/services/favorites-store';
import {
  defaultVariant,
  discountPercent,
  effectivePrice,
  variantKinds,
  variantLabel,
} from '../../core/utils/product-pricing';
import { ProductCard } from '../../shared/product-card/product-card';
import { StarRating } from '../../shared/star-rating/star-rating';
import { NotesGrid } from './notes-grid/notes-grid';
import { ProductGallery } from './product-gallery/product-gallery';
import { VariantPicker } from './variant-picker/variant-picker';

/**
 * `/produtos/:slug`. Dado mockado, via `CatalogService`.
 *
 * Seleção em dois níveis: tipo (Frasco/Decant) → tamanho, feita no
 * `VariantPicker`. Os dois são `linkedSignal`: têm um valor padrão calculado a
 * partir do produto, mas o cliente pode mudar. Trocar de produto (ex.: clicar num relacionado) ou de
 * tipo recalcula o padrão automaticamente.
 */
@Component({
  selector: 'app-product-detail',
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    ProductCard,
    StarRating,
    NotesGrid,
    ProductGallery,
    VariantPicker,
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartStore);
  private readonly favorites = inject(FavoritesStore);
  private readonly snackBar = inject(MatSnackBar);

  private readonly paramMap = toSignal(this.route.paramMap, { requireSync: true });
  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });


  protected readonly product = computed<Product | undefined>(() =>
    this.catalog.findBySlug(this.paramMap().get('slug')),
  );

  /** Tipo escolhido. Padrão: o da URL (`?tipo=decant`), senão o primeiro (frasco). */
  protected readonly kind = linkedSignal<VariantKind | undefined>(() => {
    const product = this.product();
    const kinds = product ? variantKinds(product) : [];
    const fromUrl = this.queryParamMap().get(CATALOG_QUERY_PARAMS.kind);
    return kinds.find((kind) => kind === fromUrl) ?? kinds[0];
  });

  /** Tamanho escolhido. Padrão: o mais barato disponível do tipo. */
  protected readonly variant = linkedSignal<ProductVariant | undefined>(() => {
    const product = this.product();
    const kind = this.kind();
    return product && kind ? defaultVariant(product, kind) : undefined;
  });

  protected readonly price = computed(() => {
    const variant = this.variant();
    return variant ? effectivePrice(variant) : 0;
  });
  protected readonly discount = computed(() => {
    const variant = this.variant();
    return variant ? discountPercent(variant) : null;
  });
  protected readonly installment = computed(() => this.price() / 6);
  protected readonly inStock = computed(() => (this.variant()?.stock ?? 0) > 0);

  protected readonly related = computed<readonly Product[]>(() => {
    const current = this.product();
    if (!current) return [];
    // Regra provisória; a similaridade (famílias, notas, ocasião) é a próxima etapa.
    return this.catalog
      .products()
      .filter((item) => item.id !== current.id && item.gender === current.gender)
      .slice(0, 4);
  });

  protected readonly isFavorite = (product: Product): boolean =>
    this.favorites.isFavorite(product.id);

  /** Adiciona o tamanho escolhido na página. */
  protected addSelected(product: Product): void {
    const variant = this.variant();
    if (variant) this.addToCart({ product, variant });
  }

  protected buyNow(product: Product): void {
    const variant = this.variant();
    if (!variant) return;
    this.cart.add(product, variant);
    this.router.navigate(['/carrinho']);
  }

  /** Também recebe o "Adicionar" dos cards de relacionados. */
  protected addToCart({ product, variant }: ProductSelection): void {
    this.cart.add(product, variant);
    this.snackBar.open(
      `${product.name} (${variantLabel(variant)}) foi adicionado ao carrinho.`,
      'Fechar',
      { duration: 3000 },
    );
  }

  protected toggleFavorite(product: Product): void {
    this.favorites.toggle(product);
  }
}
