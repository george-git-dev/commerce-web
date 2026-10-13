import { Commission, CreditEntry } from '../models/commission';
import {
  commissionStatus,
  creditBalance,
  paidAmount,
  payoutPreview,
  receiptProblem,
} from './commission-rules';

const DAY = 86_400_000;
const now = new Date(2026, 9, 12);
const c = (id: number, extra: Partial<Commission> = {}): Commission => ({
  id,
  affiliateEmail: 'a@x.com',
  couponCode: 'A5',
  orderNumber: `NP${id}`,
  createdAt: new Date(now.getTime() - 20 * DAY),
  base: 200,
  percent: 5,
  amount: 10,
  state: 'aberta',
  ...extra,
});

describe('comissões', () => {
  it('pendente até entrega + 7 dias; depois liberada', () => {
    expect(commissionStatus(c(1), now)).toBe('pendente');
    expect(commissionStatus(c(1, { deliveredAt: new Date(now.getTime() - 3 * DAY) }), now)).toBe(
      'pendente',
    );
    expect(commissionStatus(c(1, { deliveredAt: new Date(now.getTime() - 7 * DAY) }), now)).toBe(
      'liberada',
    );
    expect(commissionStatus(c(1, { state: 'cancelada' }), now)).toBe('cancelada');
  });

  it('crédito na loja ganha 10% de bônus', () => {
    expect(paidAmount(100, 'pix')).toBe(100);
    expect(paidAmount(100, 'credito')).toBe(110);
  });

  it('pagamento por afiliado: só liberadas e não pagas; Pix abaixo de R$ 50 não paga', () => {
    const delivered = new Date(now.getTime() - 10 * DAY);
    const list = [
      c(1, { deliveredAt: delivered, amount: 30 }),
      c(2, { deliveredAt: delivered, amount: 15, affiliateEmail: 'b@x.com' }),
      c(3, { deliveredAt: delivered, amount: 40, state: 'paga' }),
      c(4, { amount: 99 }), // pendente
    ];
    const pix = payoutPreview(list, 'a@x.com', 'pix', now);
    expect(pix).toEqual({
      method: 'pix',
      amount: 30,
      paidAmount: 30,
      commissionIds: [1],
      belowMinimum: true,
    });
    const credit = payoutPreview(list, 'b@x.com', 'credito', now);
    expect(credit.paidAmount).toBe(16.5);
    expect(credit.belowMinimum).toBe(false);
  });

  it('comprovante: PDF ou imagem até 5 MB', () => {
    expect(receiptProblem(null)).toMatch(/Anexe/);
    expect(receiptProblem({ type: 'application/pdf', size: 1000 })).toBeNull();
    expect(receiptProblem({ type: 'text/plain', size: 10 })).toMatch(/PDF/);
    expect(receiptProblem({ type: 'image/png', size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
  });

  it('saldo de crédito ignora entrada vencida', () => {
    const entries: CreditEntry[] = [
      {
        id: 1,
        email: 'a',
        kind: 'comissao',
        amount: 110,
        at: now,
        expiresAt: new Date(now.getTime() + DAY),
      },
      {
        id: 2,
        email: 'a',
        kind: 'comissao',
        amount: 50,
        at: now,
        expiresAt: new Date(now.getTime() - DAY),
      },
      { id: 3, email: 'a', kind: 'uso', amount: -30, at: now },
    ];
    expect(creditBalance(entries, now)).toBe(80);
  });
});

describe('comissões — totais', () => {
  it('soma por situação', async () => {
    const { commissionTotals } = await import('./commission-rules');
    const now = new Date(2026, 9, 12);
    const c = (
      state: 'aberta' | 'paga' | 'cancelada',
      amount: number,
      deliveredDaysAgo?: number,
    ) => ({
      id: 1,
      affiliateEmail: 'a',
      couponCode: 'A',
      orderNumber: 'N',
      createdAt: now,
      base: 0,
      percent: 5,
      amount,
      state,
      deliveredAt:
        deliveredDaysAgo === undefined
          ? undefined
          : new Date(now.getTime() - deliveredDaysAgo * 86_400_000),
    });
    const totals = commissionTotals(
      [c('aberta', 10), c('aberta', 20, 10), c('paga', 5), c('cancelada', 7)] as never,
      now,
    );
    expect(totals).toMatchObject({ pendente: 10, liberada: 20, paga: 5, cancelada: 7 });
  });
});
