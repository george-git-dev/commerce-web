import { TestBed } from '@angular/core/testing';
import { CatalogService } from './catalog-service';

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(() => {
    service = TestBed.inject(CatalogService);
  });

  it('encontra o produto pelo slug', () => {
    expect(service.findBySlug('oud-real')?.name).toBe('Oud Real');
    expect(service.findBySlug('nao-existe')).toBeUndefined();
    expect(service.findBySlug(null)).toBeUndefined();
  });

  it('devolve as sugestões na ordem do mock, sem o próprio produto', () => {
    const oud = service.findBySlug('oud-real')!;
    const related = service.related(oud).map((product) => product.slug);
    expect(related).toEqual([
      'couro-imperial',
      'baunilha-e-sandalo',
      'vetiver-noir',
      'essencia-neutra',
    ]);
    expect(related).not.toContain('oud-real');
  });
});
