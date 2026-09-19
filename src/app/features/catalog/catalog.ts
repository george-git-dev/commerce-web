import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { CATALOG_QUERY_PARAMS } from '../../core/config/navigation';
import { MOCK_PRODUCTS } from '../../core/data/mock-products';
import { CartStore } from '../../core/services/cart-store';
import { FavoritesStore } from '../../core/services/favorites-store';
import { Product } from '../../core/models/product';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ProductCard } from '../../shared/product-card/product-card';

type SortOption = 'relevancia' | 'menor-preco' | 'maior-preco' | 'avaliacao';

function toNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * `/produtos`. Dado sempre mockado (`MOCK_PRODUCTS`) — a reconexão com a API
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

  protected readonly params = CATALOG_QUERY_PARAMS;
  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly filtersOpen = signal(false);

  protected readonly brands = [
    ...new Set(MOCK_PRODUCTS.map((product) => product.brandName)),
  ].sort();

  protected readonly gender = computed(() => this.queryParamMap().get(this.params.gender));
  protected readonly brand = computed(() => this.queryParamMap().get(this.params.brand));
  protected readonly priceMin = computed(() =>
    toNumber(this.queryParamMap().get(this.params.priceMin)),
  );
  protected readonly priceMax = computed(() =>
    toNumber(this.queryParamMap().get(this.params.priceMax)),
  );
  protected readonly search = computed(() => this.queryParamMap().get(this.params.search) ?? '');
  protected readonly dealOnly = computed(
    () => this.queryParamMap().get(this.params.deal) === 'true',
  );
  protected readonly launchOnly = computed(
    () => this.queryParamMap().get(this.params.launch) === 'true',
  );
  protected readonly sort = computed<SortOption>(
    () => (this.queryParamMap().get(this.params.sort) as SortOption | null) ?? 'relevancia',
  );

  protected readonly hasActiveFilters = computed(
    () =>
      !!this.gender() ||
      !!this.brand() ||
      this.priceMin() !== null ||
      this.priceMax() !== null ||
      !!this.search() ||
      this.dealOnly() ||
      this.launchOnly(),
  );

  protected readonly products = computed<readonly Product[]>(() => {
    const gender = this.gender();
    const brand = this.brand();
    const min = this.priceMin();
    const max = this.priceMax();
    const search = this.search().trim().toLowerCase();
    const dealOnly = this.dealOnly();
    const launchOnly = this.launchOnly();

    let list = MOCK_PRODUCTS.filter((product) => {
      if (gender && product.gender !== gender) return false;
      if (brand && product.brandName !== brand) return false;
      if (min !== null && product.finalPrice < min) return false;
      if (max !== null && product.finalPrice > max) return false;
      if (dealOnly && !product.oldPrice) return false;
      if (launchOnly && product.badge !== 'Lançamento') return false;
      if (
        search &&
        !`${product.name} ${product.brandName} ${product.family ?? ''}`
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
        list.sort((a, b) => a.finalPrice - b.finalPrice);
        break;
      case 'maior-preco':
        list.sort((a, b) => b.finalPrice - a.finalPrice);
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

  protected clearFilters(): void {
    this.filtersOpen.set(false);
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  protected onAddToCart(product: Product): void {
    this.cart.add(product);
    this.snackBar.open(`${product.name} foi adicionado ao carrinho.`, 'Fechar', { duration: 3000 });
  }

  protected onToggleFavorite(product: Product): void {
    this.favorites.toggle(product);
  }
}
