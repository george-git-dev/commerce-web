import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { OCCASION_LABELS, OLFACTORY_FAMILIES, OlfactoryFamily } from '../../core/config/fragrance';
import { CATALOG_QUERY_PARAMS } from '../../core/config/navigation';
import {
  categoriesTitle,
  formatCategories,
  parseCategories,
  PRODUCT_CATEGORIES,
} from '../../core/config/product-categories';
import { CartStore } from '../../core/services/cart-store';
import { CatalogService } from '../../core/services/catalog-service';
import { FavoritesStore } from '../../core/services/favorites-store';
import { FavoriteAction } from '../../core/services/favorite-action';
import {
  Occasion,
  Product,
  ProductCategory,
  ProductSelection,
  VariantKind,
} from '../../core/models/product';
import {
  effectivePrice,
  hasDeal,
  hasKind,
  isAvailable,
  lowestPrice,
  variantLabel,
} from '../../core/utils/product-pricing';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ProductCard } from '../../shared/product-card/product-card';

type SortOption = 'relevancia' | 'mais-vendidos' | 'menor-preco' | 'maior-preco' | 'avaliacao';

const MAX_PRICE_DIGITS = 5; // até R$ 99.999

/**
 * Lê um preço da URL. Aceita só inteiros positivos com até 5 dígitos;
 * qualquer outra coisa (texto, negativo, decimal, notação 1e5…) é ignorada.
 */
function toPrice(value: string | null): number | null {
  if (!value || !new RegExp(`^\\d{1,${MAX_PRICE_DIGITS}}$`).test(value)) return null;
  return Number(value);
}

/**
 * `/produtos`. Dado mockado, via `CatalogService` — a reconexão com a API
 * real de listagem/paginação é uma etapa futura do roadmap.
 *
 * Os filtros funcionais (gênero, marca, preço, busca) vivem na URL: cada
 * mudança navega com `queryParamsHandling: 'merge'`, o que torna o estado
 * compartilhável e evita duplicar a mesma informação em signals locais.
 */
@Component({
  selector: 'app-catalog',
  imports: [NgTemplateOutlet, MatButtonModule, MatIconModule, EmptyState, ProductCard],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalog {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cart = inject(CartStore);
  private readonly favorites = inject(FavoritesStore);
  private readonly favoriteAction = inject(FavoriteAction);
  private readonly snackBar = inject(MatSnackBar);
  private readonly catalog = inject(CatalogService);

  protected readonly params = CATALOG_QUERY_PARAMS;
  protected readonly categories = PRODUCT_CATEGORIES;
  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly filtersOpen = signal(false);

  /** Famílias presentes no catálogo, na ordem da lista oficial. */
  protected readonly familyOptions = computed(() => {
    const present = new Set(this.catalog.products().flatMap((product) => product.families));
    return OLFACTORY_FAMILIES.filter((family) => present.has(family));
  });
  protected readonly ratingOptions = [4, 3] as const;
  protected readonly occasionOptions = Object.entries(OCCASION_LABELS) as [Occasion, string][];

  protected readonly brands = computed(() =>
    [...new Set(this.catalog.products().map((product) => product.brandName))].sort(),
  );

  /**
   * `?categoria=kit` ou `?categoria=hidratante,body-splash` (link "Corpo e banho").
   * Lista vazia = tudo (perfumes, kits, hidratantes, body splash).
   */
  protected readonly selectedCategories = computed(() =>
    parseCategories(this.queryParamMap().get(this.params.category)),
  );
  /**
   * Título: o da categoria/grupo ("Hidratantes", "Corpo e banho"); sem categoria,
   * o destaque ativo ("Lançamentos", "Ofertas"); senão "Todos os produtos".
   */
  protected readonly title = computed(() => {
    const categories = this.selectedCategories();
    if (categories.length) return categoriesTitle(categories);
    const launch = this.launchOnly();
    const deal = this.dealOnly();
    if (launch && deal) return 'Lançamentos e ofertas';
    if (launch) return 'Lançamentos';
    if (deal) return 'Ofertas';
    return categoriesTitle([]);
  });
  /** `?familia=Oriental,Floral` — várias valem como "ou". */
  protected readonly families = computed(() => {
    const value = this.queryParamMap().get(this.params.family);
    const ids = new Set((value ?? '').split(',').map((family) => family.trim()));
    return this.familyOptions().filter((family) => ids.has(family));
  });
  /** `?ocasiao=dia,noite` — várias valem como "ou". */
  protected readonly occasions = computed<readonly Occasion[]>(() => {
    const ids = (this.queryParamMap().get(this.params.occasion) ?? '').split(',');
    return this.occasionOptions.map(([id]) => id).filter((id) => ids.includes(id));
  });
  /** `?nota=4` — média mínima de avaliação (4 ou 3). */
  protected readonly minRating = computed(() => {
    const value = Number(this.queryParamMap().get(this.params.minRating));
    return this.ratingOptions.find((option) => option === value) ?? null;
  });
  protected readonly inStockOnly = computed(
    () => this.queryParamMap().get(this.params.inStock) === 'true',
  );
  protected readonly gender = computed(() => this.queryParamMap().get(this.params.gender));
  protected readonly brand = computed(() => this.queryParamMap().get(this.params.brand));
  protected readonly priceMin = computed(() =>
    toPrice(this.queryParamMap().get(this.params.priceMin)),
  );
  protected readonly priceMax = computed(() =>
    toPrice(this.queryParamMap().get(this.params.priceMax)),
  );
  protected readonly search = computed(() => this.queryParamMap().get(this.params.search) ?? '');
  protected readonly dealOnly = computed(
    () => this.queryParamMap().get(this.params.deal) === 'true',
  );
  protected readonly launchOnly = computed(
    () => this.queryParamMap().get(this.params.launch) === 'true',
  );
  /** `?tipo=decant` — entra no menu junto com os decants (pós-MVP). */
  protected readonly kind = computed<VariantKind | null>(() => {
    const value = this.queryParamMap().get(this.params.kind);
    return value === 'frasco' || value === 'decant' ? value : null;
  });
  protected readonly sort = computed<SortOption>(
    () => (this.queryParamMap().get(this.params.sort) as SortOption | null) ?? 'relevancia',
  );

  protected readonly hasActiveFilters = computed(
    () =>
      this.selectedCategories().length > 0 ||
      this.families().length > 0 ||
      this.occasions().length > 0 ||
      this.minRating() !== null ||
      this.inStockOnly() ||
      !!this.gender() ||
      !!this.brand() ||
      this.priceMin() !== null ||
      this.priceMax() !== null ||
      !!this.search() ||
      this.dealOnly() ||
      this.launchOnly() ||
      !!this.kind(),
  );

  protected readonly products = computed<readonly Product[]>(() => {
    const categories = this.selectedCategories();
    const families = this.families();
    const occasions = this.occasions();
    const minRating = this.minRating();
    const inStockOnly = this.inStockOnly();
    const gender = this.gender();
    const brand = this.brand();
    const min = this.priceMin();
    const max = this.priceMax();
    const search = this.search().trim().toLowerCase();
    const dealOnly = this.dealOnly();
    const launchOnly = this.launchOnly();
    const kind = this.kind();

    let list = this.catalog.products().filter((product) => {
      if (categories.length && !categories.includes(product.category)) return false;
      if (families.length && !families.some((family) => product.families.includes(family))) {
        return false;
      }
      // Produto sem ocasião cadastrada não entra quando o filtro está ativo.
      if (
        occasions.length &&
        !occasions.some((occasion) => product.occasions?.includes(occasion))
      ) {
        return false;
      }
      if (minRating !== null && (product.rating ?? 0) < minRating) return false;
      if (inStockOnly && !isAvailable(product)) return false;
      if (gender && product.gender !== gender) return false;
      if (brand && product.brandName !== brand) return false;
      // Preço: o produto entra se algum tamanho estiver dentro da faixa.
      if (
        (min !== null || max !== null) &&
        !product.variants.some((variant) => {
          const price = effectivePrice(variant);
          return (min === null || price >= min) && (max === null || price <= max);
        })
      ) {
        return false;
      }
      // Destaques: dentro do grupo vale "ou" (como nas categorias) —
      // Lançamentos + Ofertas mostra os dois, não só quem é as duas coisas.
      if (
        (dealOnly || launchOnly) &&
        !((dealOnly && hasDeal(product)) || (launchOnly && product.launch))
      ) {
        return false;
      }
      if (kind && !hasKind(product, kind)) return false;
      if (
        search &&
        !`${product.name} ${product.brandName} ${product.families.join(' ')}`
          .toLowerCase()
          .includes(search)
      ) {
        return false;
      }
      return true;
    });

    list = [...list];
    switch (this.sort()) {
      case 'mais-vendidos':
        list.sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0));
        break;
      case 'menor-preco':
        list.sort((a, b) => lowestPrice(a) - lowestPrice(b));
        break;
      case 'maior-preco':
        list.sort((a, b) => lowestPrice(b) - lowestPrice(a));
        break;
      case 'avaliacao':
        // Empate na média: quem tem mais avaliações vem antes.
        list.sort(
          (a, b) =>
            (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
        );
        break;
    }
    return list;
  });

  protected readonly isFavorite = (product: Product): boolean =>
    this.favorites.isFavorite(product.id);

  protected setFilter(key: string, value: string | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [key]: value || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Chip de categoria: marca/desmarca, permitindo combinar (ex.: hidratantes + body splash). */
  protected toggleCategory(category: ProductCategory): void {
    const current = this.selectedCategories();
    const next = current.includes(category)
      ? current.filter((id) => id !== category)
      : [...current, category];
    this.setFilter(this.params.category, formatCategories(next));
  }

  /** Checkbox de família: marca/desmarca, mantendo as outras. */
  protected toggleFamily(family: OlfactoryFamily): void {
    const current = this.families();
    const next = current.includes(family)
      ? current.filter((item) => item !== family)
      : [...current, family];
    this.setFilter(this.params.family, next.join(',') || null);
  }

  /** Checkbox de ocasião: marca/desmarca, mantendo a outra. */
  protected toggleOccasion(occasion: Occasion): void {
    const current = this.occasions();
    const next = current.includes(occasion)
      ? current.filter((item) => item !== occasion)
      : [...current, occasion];
    this.setFilter(this.params.occasion, next.join(',') || null);
  }

  /** Remove, enquanto o usuário digita, tudo que não for dígito, e limita o tamanho. */
  protected keepDigitsOnly(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, MAX_PRICE_DIGITS);
  }

  protected clearFilters(): void {
    this.filtersOpen.set(false);
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  protected onAddToCart({ product, variant }: ProductSelection): void {
    this.cart.add(product, variant);
    this.snackBar.open(
      `${product.name} (${variantLabel(product, variant)}) foi adicionado ao carrinho.`,
      'Fechar',
      { duration: 3000 },
    );
  }

  protected onToggleFavorite(product: Product): void {
    this.favoriteAction.toggle(product);
  }
}
