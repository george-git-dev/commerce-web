import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, throwError } from 'rxjs';
import { AUTH_MODE } from '../config/auth-mode';
import { SKIP_GLOBAL_ERROR } from '../http/api-context';
import { ApiError } from '../http/api-errors';
import { CATEGORIES_MOCK, HIGHLIGHTS_MOCK } from '../data/catalog-mock';
import { MOCK_PRODUCTS } from '../data/mock-products';
import { RELATED_MOCK } from '../data/related-mock';
import { Category } from '../models/category';
import { Highlight } from '../models/highlight';
import { Product } from '../models/product';
import { ProductReview, ReviewPage, ReviewSort } from '../models/review';
import {
  CatalogFilterOptions,
  CatalogPage,
  CatalogQuery,
  CatalogSort,
  filterOptionsOf,
  searchProducts,
} from '../utils/catalog-search';
import { withHighlights } from '../utils/product-highlights';
import { PromotionService } from './promotion-service';
import { ReviewService } from './review-service';
import { StorefrontContent } from './storefront-content';

/** Avaliações por página na página do produto. */
export const REVIEWS_PAGE_SIZE = 5;

const API = '/bff/catalog';

/** Ordem do front → ordem da API (avaliação ainda não existe no back: cai na relevância). */
const API_SORT: Record<CatalogSort, string> = {
  relevancia: 'relevance',
  'mais-vendidos': 'best_sellers',
  'menor-preco': 'price_asc',
  'maior-preco': 'price_desc',
  avaliacao: 'relevance',
};

/** Produto como o BFF manda (campos opcionais podem vir `null`). */
type ApiProduct = Omit<Product, 'status'> & Record<string, unknown>;

/**
 * Ponto único de acesso ao catálogo.
 * - Modo `bff`: a vitrine vem do back (`/bff/catalog`) — filtro, busca, ordem e página são de
 *   lá; aqui só se guarda o que já chegou (por slug), para carrinho e favoritos remontarem.
 * - Modo `mock` (testes e `start:mock`): o catálogo fictício, com as mesmas regras.
 *
 * Avaliações e "você também pode gostar" ainda são só do modo `mock` (dependem de pedidos reais).
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  /** Só o modo `bff` faz chamada HTTP (o simulado funciona sem `HttpClient` configurado). */
  private readonly http = inject(AUTH_MODE) === 'bff' ? inject(HttpClient) : null;
  /** Modo `bff`: produtos que já vieram do back, por slug. */
  private readonly cache = signal<ReadonlyMap<string, Product>>(new Map());
  /** Avaliações (nota, filtro e seção da página) — só no modo simulado por enquanto. */
  readonly reviewsEnabled = this.http === null;

  private readonly storefront = inject(StorefrontContent);
  private readonly reviewStore = inject(ReviewService);
  private readonly promotions = inject(PromotionService);
  private readonly categoriesState = signal<readonly Category[]>(CATEGORIES_MOCK);
  private readonly highlightsState = signal<readonly Highlight[]>(HIGHLIGHTS_MOCK);
  // Só produtos publicados chegam à loja; rascunhos ficam para o backoffice.
  private readonly productsState = signal<readonly Product[]>(
    MOCK_PRODUCTS.filter((product) => product.status === 'publicado'),
  );

  readonly categories = this.categoriesState.asReadonly();
  /** Com o valor atual do frete grátis no texto. */
  readonly highlights = computed(() =>
    this.highlightsState().flatMap((item) => {
      // Destaque do frete grátis some quando a promoção não está valendo.
      const text = this.storefront.fill(item.text);
      return text == null ? [] : [{ ...item, text }];
    }),
  );
  /**
   * Com preço promocional (promoções no ar), Lançamento e Mais vendido
   * calculados e a nota média vinda das avaliações aprovadas
   * (aprovar/reprovar já muda a nota). Fase 2: tudo
   * pronto do back.
   */
  readonly products = computed<readonly Product[]>(() =>
    this.http ? [...this.cache().values()] : this.mockProducts(),
  );

  private readonly mockProducts = computed(() =>
    withHighlights(
      this.productsState().map((raw) => {
        // Preço promocional vem só das promoções no ar (Promoções, no backoffice).
        const product = this.promotions.apply(raw);
        const approved = this.reviewStore.approvedFor(product.slug);
        if (!approved.length) return product;
        const total = approved.reduce((sum, review) => sum + review.rating, 0);
        return {
          ...product,
          rating: Math.round((total / approved.length) * 10) / 10,
          reviewCount: approved.length,
        };
      }),
    ),
  );

  /**
   * Chamado dentro de um `computed`, acompanha as mudanças de `products`. No modo `bff`, só acha
   * o que já veio do back (use `product(slug)` ou `ensureLoaded` antes).
   */
  findBySlug(slug: string | null): Product | undefined {
    if (!slug) return undefined;
    return this.http
      ? this.cache().get(slug)
      : this.products().find((product) => product.slug === slug);
  }

  /** Uma página do catálogo com os filtros e a ordem pedidos. */
  search(query: CatalogQuery): Observable<CatalogPage> {
    if (!this.http) return of(searchProducts(this.products(), query));
    return this.http
      .get<CatalogPage & { items: ApiProduct[] }>(`${API}/products`, { params: toParams(query) })
      .pipe(map((page) => ({ ...page, items: this.remember(page.items) })));
  }

  /** Página do produto. Não existe (ou saiu do catálogo) = `null`. */
  product(slug: string): Observable<Product | null> {
    if (!this.http) return of(this.findBySlug(slug) ?? null);
    return this.http
      .get<ApiProduct>(`${API}/products/${encodeURIComponent(slug)}`, {
        context: new HttpContext().set(SKIP_GLOBAL_ERROR, true),
      })
      .pipe(
        map((product) => this.remember([product])[0]),
        catchError((error: unknown) =>
          error instanceof ApiError && error.status === 404 ? of(null) : throwError(() => error),
        ),
      );
  }

  /** Busca no back os produtos que ainda não vieram (carrinho e favoritos salvos no navegador). */
  ensureLoaded(slugs: readonly string[]): Observable<void> {
    const missing = [...new Set(slugs)].filter((slug) => slug && !this.findBySlug(slug));
    if (!this.http || !missing.length) return of(undefined);
    return forkJoin(
      missing.map((slug) => this.product(slug).pipe(catchError(() => of(null)))),
    ).pipe(map(() => undefined));
  }

  /** Opções de filtro que existem na loja (marcas, famílias, selos…). */
  filterOptions(): Observable<CatalogFilterOptions> {
    if (!this.http) return of(filterOptionsOf(this.products()));
    return this.http.get<CatalogFilterOptions>(`${API}/filters`);
  }

  /** Guarda no cache (por slug) e devolve no formato do front. */
  private remember(items: readonly ApiProduct[]): Product[] {
    const products = items.map(fromApi);
    this.cache.update((cache) => {
      const next = new Map(cache);
      for (const product of products) next.set(product.slug, product);
      return next;
    });
    return products;
  }

  /**
   * "Você também pode gostar". Hoje lê o mock; na Fase 2 vira
   * `GET /products/{slug}/related?limit=4` (a regra de similaridade é do back).
   */
  related(product: Product): readonly Product[] {
    if (this.http) return [];
    const slugs = RELATED_MOCK[product.slug] ?? [];
    return slugs
      .map((slug) => this.findBySlug(slug))
      .filter((item): item is Product => item !== undefined);
  }

  /**
   * Avaliações aprovadas na ordem escolhida (padrão: mais recentes). Hoje lê o
   * mock; na Fase 2 vira `GET /products/{slug}/reviews?page=&size=&sort=`
   * (o resumo vem do back). `page` começa em 0.
   */
  reviews(
    product: Product,
    page = 0,
    size = REVIEWS_PAGE_SIZE,
    sort: ReviewSort = 'recentes',
  ): ReviewPage {
    const all = sortReviews(this.reviewStore.approvedFor(product.slug), sort);
    const distribution = [1, 2, 3, 4, 5].map(
      (stars) => all.filter((review) => review.rating === stars).length,
    );
    const total = all.reduce((sum, review) => sum + review.rating, 0);
    const end = (page + 1) * size;
    return {
      summary: {
        average: all.length ? Math.round((total / all.length) * 10) / 10 : 0,
        count: all.length,
        distribution,
      },
      items: all.slice(page * size, end),
      hasMore: end < all.length,
    };
  }
}

/** Empate na nota: a mais recente primeiro. */
function sortReviews(list: ProductReview[], sort: ReviewSort): ProductReview[] {
  const byDate = (a: ProductReview, b: ProductReview) =>
    b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
  const sorted = [...list];
  switch (sort) {
    case 'antigas':
      return sorted.sort((a, b) => -byDate(a, b));
    case 'maior-nota':
      return sorted.sort((a, b) => b.rating - a.rating || byDate(a, b));
    case 'menor-nota':
      return sorted.sort((a, b) => a.rating - b.rating || byDate(a, b));
    default:
      return sorted.sort(byDate);
  }
}

/** Filtros do front → parâmetros da vitrine (`GET /bff/catalog/products`). Vazio não vai. */
function toParams(query: CatalogQuery): HttpParams {
  const entries: [string, string | null][] = [
    ['category', query.categories.join(',') || null],
    ['family', query.families.join(',') || null],
    ['occasion', query.occasions.join(',') || null],
    ['gender', query.gender],
    ['brand', query.brand],
    ['minPrice', query.minPrice === null ? null : String(query.minPrice)],
    ['maxPrice', query.maxPrice === null ? null : String(query.maxPrice)],
    ['q', query.search.trim() || null],
    ['inStock', query.inStock ? 'true' : null],
    ['kind', query.kind],
    ['deal', query.deal ? 'true' : null],
    ['launch', query.launch ? 'true' : null],
    ['bestSeller', query.bestSeller ? 'true' : null],
    ['badge', query.badges.join(',') || null],
    ['sort', API_SORT[query.sort]],
    ['page', String(query.page)],
    ['size', String(query.size)],
  ];
  return entries.reduce(
    (params, [key, value]) => (value === null ? params : params.set(key, value)),
    new HttpParams(),
  );
}

/** `null` vira campo ausente (o front usa opcionais); só publicado chega à vitrine. */
function fromApi(raw: ApiProduct): Product {
  const product = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== null),
  ) as unknown as Product;
  const kitItems = product.kitItems?.length ? product.kitItems : undefined;
  return {
    ...product,
    kitItems,
    status: 'publicado',
    variants: product.variants.map(
      (variant) =>
        Object.fromEntries(
          Object.entries(variant).filter(([, value]) => value !== null),
        ) as unknown as Product['variants'][number],
    ),
  };
}
