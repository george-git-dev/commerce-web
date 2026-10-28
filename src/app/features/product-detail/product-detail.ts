import { CartActions } from '../../core/services/cart-actions';
import { Busy } from '../../shared/busy/busy';
import { CurrencyPipe, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CATALOG_QUERY_PARAMS } from '../../core/config/navigation';
import { categoryInfo } from '../../core/config/product-categories';
import { Product, ProductSelection, ProductVariant, VariantKind } from '../../core/models/product';
import { CatalogService } from '../../core/services/catalog-service';
import { FavoritesStore } from '../../core/services/favorites-store';
import { FavoriteAction } from '../../core/services/favorite-action';
import {
  defaultVariant,
  discountPercent,
  effectivePrice,
  lowestPrice,
  variantKinds,
} from '../../core/utils/product-pricing';
import { Seo } from '../../core/seo/seo';
import { productJsonLd } from '../../core/seo/structured-data';
import { ProductCard } from '../../shared/product-card/product-card';
import { StarRating } from '../../shared/star-rating/star-rating';
import { NotesGrid } from './notes-grid/notes-grid';
import { ProductGallery } from './product-gallery/product-gallery';
import { ProductReviews } from './product-reviews/product-reviews';
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
    ProductReviews,
    ProductGallery,
    VariantPicker,
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetail {
  private readonly cartActions = inject(CartActions);
  /** Botões ocupados enquanto o back confirma (sem clique repetido, sem espera eterna). */
  protected readonly adding = new Busy();
  protected readonly buying = new Busy();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly favorites = inject(FavoritesStore);
  private readonly favoriteAction = inject(FavoriteAction);
  private readonly document = inject(DOCUMENT);
  private readonly seo = inject(Seo);

  constructor() {
    // Título, descrição, imagem da prévia e dados estruturados (preço, estoque, estrelas).
    effect(() => {
      const product = this.product();
      const path = `/produtos/${this.paramMap().get('slug') ?? ''}`;
      if (!product) {
        this.seo.update({ title: 'Produto não encontrado | Nani Perfumes', noindex: true }, path);
        return;
      }
      const price = lowestPrice(product).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      this.seo.update(
        {
          title: `${product.name} — ${product.brandName} | Nani Perfumes`,
          description: `${product.brandName} ${product.name}, a partir de ${price}. ${product.description}`,
          image: product.images[0],
          type: 'product',
          jsonLd: productJsonLd(product, path),
        },
        path,
      );
    });
  }

  private readonly paramMap = toSignal(this.route.paramMap, { requireSync: true });
  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly product = computed<Product | undefined>(() =>
    this.catalog.findBySlug(this.paramMap().get('slug')),
  );

  /** Breadcrumb: categoria do produto ("Perfumes", "Hidratantes"…), linkando o catálogo filtrado. */
  protected readonly categoryCrumb = computed(() => {
    const product = this.product();
    if (!product) return null;
    return {
      label: categoryInfo(product.category).plural,
      queryParams: { [CATALOG_QUERY_PARAMS.category]: product.category },
    };
  });

  /**
   * Linha abaixo do nome: concentração (perfume) ou categoria + gênero —
   * ex.: "Eau de Toilette · Masculino", "Hidratante · Feminino".
   */
  protected readonly typeLine = computed(() => {
    const product = this.product();
    if (!product) return '';
    const type =
      product.category === 'perfume' ? product.concentration : categoryInfo(product.category).label;
    return [type, product.gender].filter(Boolean).join(' · ');
  });

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

  /** Sugestões vindas do back (hoje, mock). O front não aplica regra nenhuma. */
  protected readonly related = computed<readonly Product[]>(() => {
    const current = this.product();
    return current ? this.catalog.related(current) : [];
  });

  protected readonly isFavorite = (product: Product): boolean =>
    this.favorites.isFavorite(product.id);

  /** Adiciona o tamanho escolhido na página. */
  /** Clique nas estrelas do topo: rola até a seção de avaliações. */
  protected scrollToReviews(): void {
    this.document.getElementById('avaliacoes')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected addSelected(product: Product): void {
    const variant = this.variant();
    if (variant) this.addToCart({ product, variant });
  }

  protected buyNow(product: Product): void {
    const variant = this.variant();
    if (!variant) return;
    this.cartActions.add(product, variant, this.buying, () => this.router.navigate(['/carrinho']));
  }

  /** Também recebe o "Adicionar" dos cards de relacionados. */
  protected addToCart({ product, variant }: ProductSelection): void {
    this.cartActions.add(product, variant, this.adding);
  }

  protected toggleFavorite(product: Product): void {
    this.favoriteAction.toggle(product);
  }
}
