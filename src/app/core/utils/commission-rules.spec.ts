import { Commission, CreditEntry } from '../models/commission';
import { commissionStatus, creditBalance, paidAmount, planPayouts } from './commission-rules';

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

  it('fechamento: Pix abaixo de R$ 50 acumula; crédito não tem mínimo; pagas não entram', () => {
    const delivered = new Date(now.getTime() - 10 * DAY);
    const list = [
      c(1, { deliveredAt: delivered, amount: 30 }),
      c(2, { deliveredAt: delivered, amount: 15, affiliateEmail: 'b@x.com' }),
      c(3, { deliveredAt: delivered, amount: 40, state: 'paga' }),
      c(4, { amount: 99 }), // pendente
    ];
    const { plans, carried } = planPayouts(list, (e) => (e === 'b@x.com' ? 'credito' : 'pix'), now);
    expect(carried).toEqual([{ affiliateEmail: 'a@x.com', amount: 30 }]);
    expect(plans).toEqual([
      {
        affiliateEmail: 'b@x.com',
        method: 'credito',
        amount: 15,
        paidAmount: 16.5,
        commissionIds: [2],
      },
    ]);
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
