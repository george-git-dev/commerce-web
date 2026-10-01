import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { CATALOG_QUERY_PARAMS } from '../../core/config/navigation';
import {
  CATEGORY_LABELS,
  isProductCategory,
  PRODUCT_CATEGORIES,
} from '../../core/config/product-categories';
import { CartStore } from '../../core/services/cart-store';
import { CatalogService } from '../../core/services/catalog-service';
import { FavoritesStore } from '../../core/services/favorites-store';
import { Product, ProductSelection, VariantKind } from '../../core/models/product';
import {
  effectivePrice,
  hasDeal,
  hasKind,
  lowestPrice,
  variantLabel,
} from '../../core/utils/product-pricing';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ProductCard } from '../../shared/product-card/product-card';

type SortOption = 'relevancia' | 'menor-preco' | 'maior-preco' | 'avaliacao';

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
  private readonly snackBar = inject(MatSnackBar);
  private readonly catalog = inject(CatalogService);

  protected readonly params = CATALOG_QUERY_PARAMS;
  protected readonly categories = PRODUCT_CATEGORIES;
  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly filtersOpen = signal(false);

  protected readonly brands = computed(() =>
    [...new Set(this.catalog.products().map((product) => product.brandName))].sort(),
  );

  /** `?categoria=kit`. Sem categoria = tudo (perfumes, kits, hidratantes, body splash). */
  protected readonly category = computed(() => {
    const value = this.queryParamMap().get(this.params.category);
    return isProductCategory(value) ? value : null;
  });
  /** Título da página: "Todos os produtos" ou o nome da categoria escolhida. */
  protected readonly title = computed(() => {
    const category = this.category();
    return category ? CATEGORY_LABELS[category].plural : 'Todos os produtos';
  });
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
      !!this.category() ||
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
    const category = this.category();
    const gender = this.gender();
    const brand = this.brand();
    const min = this.priceMin();
    const max = this.priceMax();
    const search = this.search().trim().toLowerCase();
    const dealOnly = this.dealOnly();
    const launchOnly = this.launchOnly();
    const kind = this.kind();

    let list = this.catalog.products().filter((product) => {
      if (category && product.category !== category) return false;
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
      if (dealOnly && !hasDeal(product)) return false;
      if (launchOnly && !product.launch) return false;
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
      case 'menor-preco':
        list.sort((a, b) => lowestPrice(a) - lowestPrice(b));
        break;
      case 'maior-preco':
        list.sort((a, b) => lowestPrice(b) - lowestPrice(a));
        break;
      case 'avaliacao':
        list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
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
    this.favorites.toggle(product);
  }
}
