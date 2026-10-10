import { TestBed } from '@angular/core/testing';
import { CatalogService } from './catalog-service';
import { ReviewService } from './review-service';

describe('ReviewService (moderação)', () => {
  beforeEach(() => localStorage.clear());

  const submission = {
    orderNumber: 'NP900001',
    itemId: 'NP900001-0',
    slug: 'lattafa-asad',
    productName: 'Asad',
    variantLabel: 'Frasco 100 ml',
    rating: 1,
    comment: 'Não gostei da fixação.',
  };

  it('envio entra pendente e não aparece na loja até aprovar', () => {
    const reviews = TestBed.inject(ReviewService);
    const catalog = TestBed.inject(CatalogService);
    const before = reviews.approvedFor('lattafa-asad').length;
    const pending = reviews.pendingCount();
    reviews.submit(submission);
    const record = reviews.of('NP900001', 'NP900001-0')!;
    expect(record.status).toBe('pendente');
    expect(reviews.pendingCount()).toBe(pending + 1);
    expect(reviews.approvedFor('lattafa-asad').length, 'ainda fora').toBe(before);

    const ratingBefore = catalog.findBySlug('lattafa-asad')!.rating!;
    reviews.setStatus(record.id, 'aprovada', 'Admin');
    expect(reviews.approvedFor('lattafa-asad').length, 'publicada').toBe(before + 1);
    expect(catalog.findBySlug('lattafa-asad')!.reviewCount, 'contagem').toBe(before + 1);
    expect(catalog.findBySlug('lattafa-asad')!.rating!, 'nota 1 baixa a média').toBeLessThan(
      ratingBefore,
    );
  });

  it('loja ordena por data e por nota', () => {
    const catalog = TestBed.inject(CatalogService);
    const product = catalog.findBySlug('lattafa-asad')!;
    const all = (sort: Parameters<CatalogService['reviews']>[3]) =>
      catalog.reviews(product, 0, 100, sort).items;
    const recent = all('recentes');
    expect(all('antigas')[0].id, 'antigas = inverso').toBe(recent.at(-1)!.id);
    const high = all('maior-nota').map((r) => r.rating);
    expect(high, 'maior primeiro').toEqual([...high].sort((a, b) => b - a));
    const low = all('menor-nota').map((r) => r.rating);
    expect(low, 'menor primeiro').toEqual([...low].sort((a, b) => a - b));
  });

  it('resposta da loja vai para a loja sem quem respondeu', () => {
    const reviews = TestBed.inject(ReviewService);
    reviews.submit(submission);
    const { id } = reviews.of('NP900001', 'NP900001-0')!;
    reviews.setStatus(id, 'aprovada', 'Admin');
    reviews.setReply(id, 'Obrigado pelo retorno!', 'Admin');
    const published = reviews.approvedFor('lattafa-asad').find((review) => review.id === id)!;
    expect(published.reply?.text).toBe('Obrigado pelo retorno!');
    expect('replyBy' in published, 'sem nome interno').toBe(false);
    reviews.setReply(id, '', 'Admin');
    expect(reviews.find(id)!.reply, 'removida').toBeUndefined();
  });
});
