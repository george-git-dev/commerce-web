import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AUTH_MODE } from '../config/auth-mode';
import { apiInterceptor } from '../http/api-interceptor';
import { EMPTY_CATALOG_QUERY } from '../utils/catalog-search';
import { CatalogService } from './catalog-service';

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(() => {
    service = TestBed.inject(CatalogService);
  });

  it('encontra o produto pelo slug', () => {
    expect(service.findBySlug('lattafa-asad')?.name).toBe('Asad');
    expect(service.findBySlug('nao-existe')).toBeUndefined();
    expect(service.findBySlug(null)).toBeUndefined();
  });

  it('devolve as sugestões na ordem do mock, sem o próprio produto', () => {
    const asad = service.findBySlug('lattafa-asad')!;
    const related = service.related(asad).map((product) => product.slug);
    expect(related).toEqual([
      'lattafa-khamrah',
      'afnan-9pm',
      'swiss-arabian-shaghaf-oud',
      'al-haramain-amber-oud-gold-edition',
    ]);
    expect(related).not.toContain('lattafa-asad');
  });

  it('pagina as avaliações e o resumo bate com o produto', () => {
    const khamrah = service.findBySlug('lattafa-khamrah')!;
    const first = service.reviews(khamrah, 0, 5);
    expect(first.items.length).toBe(5);
    expect(first.hasMore).toBe(true);
    expect(first.summary.count).toBe(khamrah.reviewCount);
    expect(first.summary.average).toBe(khamrah.rating);
    expect(first.summary.distribution.reduce((sum, total) => sum + total, 0)).toBe(
      khamrah.reviewCount,
    );

    const last = service.reviews(khamrah, 2, 5);
    expect(last.hasMore).toBe(false);
    // Mais recentes primeiro.
    const dates = first.items.map((review) => review.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('produto sem avaliações devolve resumo zerado', () => {
    const page = service.reviews(service.findBySlug('lattafa-bade-e-al-oud-oud-for-glory')!);
    expect(page.summary.count).toBe(0);
    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(false);
  });
});

describe('CatalogService (modo bff: a vitrine vem do back)', () => {
  const asad = {
    id: 1,
    slug: 'lattafa-asad',
    line: 'Asad',
    subtitle: null,
    name: 'Asad',
    description: 'Oriental',
    brandId: 1,
    brandName: 'Lattafa',
    category: 'perfume',
    gender: 'Masculino',
    concentration: 'Eau de Parfum',
    families: ['Oriental'],
    notes: null,
    kitItems: [],
    occasions: ['noite'],
    launch: false,
    bestSeller: true,
    badge: null,
    soldCount: 10,
    images: ['img/produtos/a.webp'],
    variants: [
      {
        id: 'lattafa-asad-100',
        kind: 'frasco',
        volumeMl: 100,
        price: 299.9,
        promoPrice: null,
        stock: 3,
      },
    ],
  };
  let catalog: CatalogService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_MODE, useValue: 'bff' },
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    catalog = TestBed.inject(CatalogService);
    backend = TestBed.inject(HttpTestingController);
  });

  it('busca manda os filtros no formato do back e só os preenchidos', () => {
    catalog
      .search({
        ...EMPTY_CATALOG_QUERY,
        categories: ['perfume', 'kit'],
        search: ' oud ',
        sort: 'menor-preco',
        inStock: true,
        page: 1,
      })
      .subscribe();
    const req = backend.expectOne((r) => r.url === '/bff/catalog/products');
    expect(req.request.params.get('category')).toBe('perfume,kit');
    expect(req.request.params.get('q')).toBe('oud');
    expect(req.request.params.get('sort')).toBe('price_asc');
    expect(req.request.params.get('inStock')).toBe('true');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.has('brand')).toBe(false);
    expect(req.request.params.has('deal')).toBe(false);
    req.flush({ items: [asad], page: 1, size: 24, totalItems: 25, totalPages: 2 });
  });

  it('produto que veio do back fica guardado (nulos viram campos ausentes)', async () => {
    const found = firstValueFrom(catalog.product('lattafa-asad'));
    backend.expectOne('/bff/catalog/products/lattafa-asad').flush(asad);
    const product = await found;
    expect(product?.notes).toBeUndefined();
    expect(product?.kitItems).toBeUndefined();
    expect(product?.variants[0].promoPrice).toBeUndefined();
    expect(product?.status).toBe('publicado');
    expect(catalog.findBySlug('lattafa-asad')?.name).toBe('Asad');
    // Já guardado: não busca de novo.
    catalog.ensureLoaded(['lattafa-asad']).subscribe();
    backend.expectNone('/bff/catalog/products/lattafa-asad');
  });

  it('produto que não existe vira null (sem aviso de erro na tela)', async () => {
    const found = firstValueFrom(catalog.product('nao-existe'));
    backend
      .expectOne('/bff/catalog/products/nao-existe')
      .flush(
        { status: 404, code: 'PRODUCT_NOT_FOUND', detail: 'Produto não encontrado.' },
        { status: 404, statusText: 'Not Found' },
      );
    expect(await found).toBeNull();
  });
});
