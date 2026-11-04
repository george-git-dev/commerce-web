import { CartActions } from '../../core/services/cart-actions';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { OCCASION_LABELS, OLFACTORY_FAMILIES, OlfactoryFamily } from '../../core/config/fragrance';
import { CATALOG_QUERY_PARAMS } from '../../core/config/navigation';
import {
  categoriesTitle,
  formatCategories,
  parseCategories,
  PRODUCT_CATEGORIES,
} from '../../core/config/product-categories';
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
import { CatalogQuery, CatalogSort } from '../../core/utils/catalog-search';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ProductCard } from '../../shared/product-card/product-card';

type SortOption = CatalogSort;

/** Produtos por vez ("Carregar mais" busca a próxima página). */
export const CATALOG_PAGE_SIZE = 24;

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
 * `/produtos`. Filtro, busca, ordem e página são do `CatalogService` (no login de verdade, do
 * back): a tela monta a consulta a partir da URL e só mostra o que volta.
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
  private readonly cartActions = inject(CartActions);
  private readonly favorites = inject(FavoritesStore);
  private readonly favoriteAction = inject(FavoriteAction);
  private readonly catalog = inject(CatalogService);

  protected readonly params = CATALOG_QUERY_PARAMS;
  protected readonly categories = PRODUCT_CATEGORIES;
  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly filtersOpen = signal(false);

  /** Opções de filtro que existem na loja (vêm prontas do back no modo `bff`). */
  private readonly options = toSignal(this.catalog.filterOptions(), { initialValue: null });

  /** Avaliações só existem no modo simulado: sem elas, some o filtro e a ordem por nota. */
  protected readonly reviewsEnabled = this.catalog.reviewsEnabled;

  /** Famílias presentes no catálogo, na ordem da lista oficial. */
  protected readonly familyOptions = computed(() => {
    const present = new Set(this.options()?.families ?? []);
    return OLFACTORY_FAMILIES.filter((family) => present.has(family));
  });
  protected readonly ratingOptions = [4, 3] as const;
  protected readonly occasionOptions = Object.entries(OCCASION_LABELS) as [Occasion, string][];

  /** Selos manuais presentes no catálogo (Exclusivo, Edição limitada…), em ordem alfabética. */
  protected readonly badgeOptions = computed(() => this.options()?.badges ?? []);

  protected readonly brands = computed(() => this.options()?.brands ?? []);

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
    const highlights = [
      ...(this.launchOnly() ? ['Lançamentos'] : []),
      ...(this.dealOnly() ? ['Ofertas'] : []),
      ...(this.bestSellerOnly() ? ['Mais vendidos'] : []),
      ...this.badges(),
    ];
    return highlights.length ? highlights.join(' · ') : categoriesTitle([]);
  });
  /** `?familia=Oriental,Floral` — várias valem como "ou". */
  protected readonly families = computed(() => {
    // Direto da URL (não espera as opções do back): a busca sai certa já na primeira vez.
    const value = this.queryParamMap().get(this.params.family) ?? '';
    return OLFACTORY_FAMILIES.filter((family) =>
      value.split(',').some((item) => item.trim() === family),
    );
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
  protected readonly bestSellerOnly = computed(
    () => this.queryParamMap().get(this.params.bestSeller) === 'true',
  );
  /** `?selo=Exclusivo,Edição limitada`. */
  protected readonly badges = computed(() => {
    // Direto da URL (não espera as opções do back); selo que não existe só não acha nada.
    return (this.queryParamMap().get(this.params.badge) ?? '')
      .split(',')
      .map((badge) => badge.trim())
      .filter(Boolean);
  });
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
      this.bestSellerOnly() ||
      this.badges().length > 0 ||
      !!this.kind(),
  );

  /**
   * A consulta que a URL pede (sem a página: mudar filtro volta para a primeira). Só conta como
   * mudança se o conteúdo mudar: as opções de filtro chegando do back recalculam famílias e
   * selos (mesmos valores), e isso não pode disparar outra busca.
   */
  private readonly query = computed<Omit<CatalogQuery, 'page'>>(
    () => ({
      categories: this.selectedCategories(),
      families: this.families(),
      occasions: this.occasions(),
      minRating: this.reviewsEnabled ? this.minRating() : null,
      inStock: this.inStockOnly(),
      gender: this.gender(),
      brand: this.brand(),
      minPrice: this.priceMin(),
      maxPrice: this.priceMax(),
      search: this.search(),
      deal: this.dealOnly(),
      launch: this.launchOnly(),
      bestSeller: this.bestSellerOnly(),
      badges: this.badges(),
      kind: this.kind(),
      sort: this.sort(),
      size: CATALOG_PAGE_SIZE,
    }),
    { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );

  /** Produtos já carregados (todas as páginas pedidas até agora). */
  protected readonly products = signal<readonly Product[]>([]);
  /** Quantos passam nos filtros, contando as páginas ainda não carregadas. */
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly hasMore = computed(() => this.products().length < this.total());
  private page = 0;
  private request?: Subscription;

  constructor() {
    // Mudou um filtro (ou a ordem): busca de novo a partir da primeira página.
    effect(() => {
      const query = this.query();
      untracked(() => this.load(query, 0));
    });
  }

  protected loadMore(): void {
    this.load(this.query(), this.page + 1);
  }

  protected retry(): void {
    this.load(this.query(), 0);
  }

  /** A busca anterior (se ainda não voltou) é cancelada: só vale a última. */
  private load(query: Omit<CatalogQuery, 'page'>, page: number): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.loadFailed.set(false);
    this.request = this.catalog.search({ ...query, page }).subscribe({
      next: (result) => {
        this.products.update((current) =>
          page === 0 ? result.items : [...current, ...result.items],
        );
        this.total.set(result.totalItems);
        this.page = page;
        this.loading.set(false);
      },
      error: () => {
        this.loadFailed.set(true);
        this.loading.set(false);
      },
    });
  }

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

  /** Chip de selo (Exclusivo, Edição limitada…): marca/desmarca, mantendo os outros. */
  protected toggleBadge(badge: string): void {
    const current = this.badges();
    const next = current.includes(badge)
      ? current.filter((item) => item !== badge)
      : [...current, badge];
    this.setFilter(this.params.badge, next.join(',') || null);
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
    this.cartActions.add(product, variant);
  }

  protected onToggleFavorite(product: Product): void {
    this.favoriteAction.toggle(product);
  }
}
