import { TestBed } from '@angular/core/testing';
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
