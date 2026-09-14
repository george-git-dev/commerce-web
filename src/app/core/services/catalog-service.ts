import { Injectable, signal } from '@angular/core';
import { CATEGORIES_MOCK, FEATURED_PRODUCTS_MOCK, HIGHLIGHTS_MOCK } from '../data/catalog-mock';
import { Category } from '../models/category';
import { Highlight } from '../models/highlight';
import { Product } from '../models/product';

/**
 * Ponto único de acesso ao catálogo.
 *
 * Hoje entrega os mocks de forma síncrona. Para passar a consumir a API basta injetar
 * `HttpClient` aqui e alimentar os mesmos signals (ou trocá-los por `resource()`);
 * os componentes leem os signals e não precisam mudar.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly highlightsState = signal<readonly Highlight[]>(HIGHLIGHTS_MOCK);
  private readonly categoriesState = signal<readonly Category[]>(CATEGORIES_MOCK);
  private readonly featuredProductsState = signal<readonly Product[]>(FEATURED_PRODUCTS_MOCK);

  readonly highlights = this.highlightsState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly featuredProducts = this.featuredProductsState.asReadonly();
}
