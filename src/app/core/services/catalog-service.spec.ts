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
});
