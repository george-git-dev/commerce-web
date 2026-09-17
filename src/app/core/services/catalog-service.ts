import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CATEGORIES_MOCK, HIGHLIGHTS_MOCK } from '../data/catalog-mock';
import { Category } from '../models/category';
import { Highlight } from '../models/highlight';
import { Product } from '../models/product';

/**
 * Ponto único de acesso ao catálogo.
 *
 * `products` consome a Commerce API real (`GET /products`). Se a chamada falhar,
 * cai para uma lista vazia em vez de quebrar a tela.
 *
 * `categories`/`highlights` seguem mockados: o `CategoryResponse` real não tem
 * imagem/descrição, que a `categories-section` da home depende.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  private readonly categoriesState = signal<readonly Category[]>(CATEGORIES_MOCK);
  private readonly highlightsState = signal<readonly Highlight[]>(HIGHLIGHTS_MOCK);

  readonly categories = this.categoriesState.asReadonly();
  readonly highlights = this.highlightsState.asReadonly();

  readonly products = toSignal(
    this.http
      .get<readonly Product[]>(`${environment.apiUrl}/products`)
      .pipe(catchError(() => of<readonly Product[]>([]))),
    { initialValue: [] },
  );
}