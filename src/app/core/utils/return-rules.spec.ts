import { ReturnRequest } from '../models/return-request';
import {
  canReview,
  deadlineProblem,
  photoProblem,
  isWholeOrder,
  refundAmount,
  returnableQuantity,
  returnDraftProblems,
} from './return-rules';

const DAY = 86_400_000;

describe('regras de devolução', () => {
  it('prazos do CDC: 7 dias para desistir, 30 para defeito', () => {
    const now = new Date(2026, 9, 12);
    const delivered = (days: number) => new Date(now.getTime() - days * DAY);
    expect(deadlineProblem(delivered(5), 'arrependimento', now)).toBeNull();
    expect(deadlineProblem(delivered(8), 'arrependimento', now)).toContain('7 dias');
    expect(deadlineProblem(delivered(20), 'defeito', now)).toBeNull();
    expect(deadlineProblem(delivered(31), 'produto-errado', now)).toContain('30 dias');
    expect(deadlineProblem(undefined, 'defeito', now)).toContain('entregue');
  });

  it('estorno: itens com a parte do desconto; frete só no pedido inteiro', () => {
    const order = { subtotal: 200, discount: 20, shippingPrice: 15 };
    expect(refundAmount([{ quantity: 1, unitPrice: 100 }], order, false)).toBe(90);
    expect(refundAmount([{ quantity: 2, unitPrice: 100 }], order, true)).toBe(195);
  });

  it('não devolve mais do que comprou (descontando devoluções não recusadas)', () => {
    const previous = [
      { status: 'concluida', items: [{ itemId: 'A', quantity: 1 }] },
      { status: 'recusada', items: [{ itemId: 'A', quantity: 1 }] },
    ] as unknown as ReturnRequest[];
    expect(returnableQuantity({ id: 'A', quantity: 2 }, previous)).toBe(1);
    expect(isWholeOrder([{ id: 'A', quantity: 2 }], [{ itemId: 'A', quantity: 2 }], [])).toBe(true);
    expect(isWholeOrder([{ id: 'A', quantity: 2 }], [{ itemId: 'A', quantity: 1 }], [])).toBe(
      false,
    );
  });

  it('desistência exige lacre confirmado; avaria/defeito exigem descrição e foto', () => {
    const items = [{ quantity: 1, max: 1 }];
    expect(
      returnDraftProblems({
        items,
        reason: 'arrependimento',
        description: '',
        sealedConfirmed: true,
      }),
    ).toEqual([]);
    expect(returnDraftProblems({ items, reason: 'arrependimento', description: '' })).toEqual([
      'Confirme que o produto está lacrado, sem uso e na embalagem original.',
    ]);
    expect(returnDraftProblems({ items, reason: 'defeito', description: 'ruim' })).toHaveLength(2);
    expect(
      returnDraftProblems({ items, reason: 'avariado', description: 'Chegou vazando', photos: 2 }),
    ).toEqual([]);
    expect(
      returnDraftProblems({ items, reason: 'defeito', description: 'ruim demais', byStaff: true }),
    ).toEqual([]);
    expect(photoProblem({ name: 'a.gif', type: 'image/gif', size: 10 })).toContain('JPG');
    expect(photoProblem({ name: 'a.jpg', type: 'image/jpeg', size: 6e6 })).toContain('5 MB');
    expect(
      returnDraftProblems({ items: [{ quantity: 0, max: 1 }], reason: null, description: '' }),
    ).toHaveLength(2);
  });

  it('avaliação só depois dos 7 dias de desistência', () => {
    const now = new Date(2026, 9, 12);
    expect(canReview(new Date(now.getTime() - 2 * DAY), now)).toBe(false);
    expect(canReview(new Date(now.getTime() - 8 * DAY), now)).toBe(true);
    expect(canReview(undefined, now)).toBe(true);
  });
});
