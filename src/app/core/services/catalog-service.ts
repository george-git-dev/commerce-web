import { Injectable, signal } from '@angular/core';
import { CATEGORIES_MOCK, HIGHLIGHTS_MOCK } from '../data/catalog-mock';
import { MOCK_PRODUCTS } from '../data/mock-products';
import { Category } from '../models/category';
import { Highlight } from '../models/highlight';
import { Product } from '../models/product';

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
}
