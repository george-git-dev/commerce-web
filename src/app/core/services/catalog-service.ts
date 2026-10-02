import { Injectable, signal } from '@angular/core';
import { CATEGORIES_MOCK, HIGHLIGHTS_MOCK } from '../data/catalog-mock';
import { MOCK_PRODUCTS } from '../data/mock-products';
import { RELATED_MOCK } from '../data/related-mock';
import { REVIEWS_MOCK } from '../data/reviews-mock';
import { Category } from '../models/category';
import { Highlight } from '../models/highlight';
import { Product } from '../models/product';
import { ReviewPage } from '../models/review';

/** Avaliações por página na página do produto. */
export const REVIEWS_PAGE_SIZE = 5;

/**
 * Ponto único de acesso ao catálogo. Tudo mockado até a Fase 2.
 *
 * Migração planejada: injetar o `HttpClient` e alimentar os mesmos signals
 * (ou trocar por `resource()`); quem consome continua lendo signals.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly categoriesState = signal<readonly Category[]>(CATEGORIES_MOCK);
  private readonly highlightsState = signal<readonly Highlight[]>(HIGHLIGHTS_MOCK);
  // Só produtos publicados chegam à loja; rascunhos ficam para o backoffice.
  private readonly productsState = signal<readonly Product[]>(
    MOCK_PRODUCTS.filter((product) => product.status === 'publicado'),
  );

  readonly categories = this.categoriesState.asReadonly();
  readonly highlights = this.highlightsState.asReadonly();
  readonly products = this.productsState.asReadonly();

  /** Chamado dentro de um `computed`, acompanha as mudanças de `products`. */
  findBySlug(slug: string | null): Product | undefined {
    return slug ? this.products().find((product) => product.slug === slug) : undefined;
  }

  /**
   * "Você também pode gostar". Hoje lê o mock; na Fase 2 vira
   * `GET /products/{slug}/related?limit=4` (a regra de similaridade é do back).
   */
  related(product: Product): readonly Product[] {
    const slugs = RELATED_MOCK[product.slug] ?? [];
    return slugs
      .map((slug) => this.findBySlug(slug))
      .filter((item): item is Product => item !== undefined);
  }

  /**
   * Avaliações aprovadas, mais recentes primeiro. Hoje lê o mock; na Fase 2 vira
   * `GET /products/{slug}/reviews?page=&size=` (o resumo vem do back).
   * `page` começa em 0.
   */
  reviews(product: Product, page = 0, size = REVIEWS_PAGE_SIZE): ReviewPage {
    const all = REVIEWS_MOCK[product.slug] ?? [];
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
