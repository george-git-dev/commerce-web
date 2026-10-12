import { AFFILIATE_PROGRAM } from '../config/affiliate';
import { Commission, CreditEntry, Payout } from '../models/commission';
import { commissionAmount, paidAmount } from '../utils/commission-rules';

const DAY = 86_400_000;

/**
 * Histórico FICTÍCIO da afiliada de exemplo (JULIA5), relativo a hoje: pagas
 * (dois fechamentos: um Pix, um crédito na loja), liberadas, pendentes e
 * canceladas. Números de pedido fictícios. Some na Fase 2.
 */
export function commissionsMock(now = new Date()) {
  const email = 'julia.afiliada@email.com';
  const percent = AFFILIATE_PROGRAM.commissionPercent;
  const ago = (days: number) => new Date(now.getTime() - days * DAY);
  // [dias atrás da compra, base, entregue X dias depois (null = não entregue), cancelada?]
  const rows: [number, number, number | null, boolean?][] = [
    [95, 284.9, 4],
    [90, 189.9, 5],
    [86, 349.8, 3],
    [80, 152.0, 4],
    [74, 299.9, 6],
    [70, 89.7, 3],
    [66, 412.5, 5],
    [61, 239.9, 4],
    [57, 179.9, null, true],
    [52, 329.9, 5],
    [48, 264.6, 4],
    [44, 119.8, 3],
    [40, 289.9, 4],
    [35, 199.9, 6],
    [30, 359.8, 3],
    [24, 149.9, 4],
    [20, 279.9, 5],
    [16, 229.9, 4],
    [12, 189.9, 3],
    [9, 309.8, null, true],
    [6, 259.9, null],
    [4, 139.9, null],
    [2, 329.9, null],
  ];
  const commissions: Commission[] = rows.map(([days, base, delivered, cancelled], i) => ({
    id: i + 1,
    affiliateEmail: email,
    couponCode: 'JULIA5',
    orderNumber: `NP2${String(31000 + i * 37).padStart(5, '0')}`,
    createdAt: ago(days),
    base,
    percent,
    amount: commissionAmount(base, percent),
    state: cancelled ? 'cancelada' : 'aberta',
    deliveredAt: delivered == null ? undefined : ago(days - delivered),
  }));

  // Fechamentos passados: há ~60 dias (Pix) e ~30 dias (crédito na loja).
  const payouts: Payout[] = [];
  const close = (id: number, daysAgo: number, method: Payout['method']) => {
    const at = ago(daysAgo);
    const ids = commissions
      .filter(
        (c) =>
          c.state === 'aberta' &&
          c.deliveredAt &&
          c.deliveredAt.getTime() + 7 * DAY <= at.getTime(),
      )
      .map((c) => c.id);
    if (!ids.length) return;
    const amount =
      Math.round(
        commissions.filter((c) => ids.includes(c.id)).reduce((s, c) => s + c.amount, 0) * 100,
      ) / 100;
    for (const c of commissions)
      if (ids.includes(c.id)) Object.assign(c, { state: 'paga', payoutId: id });
    payouts.push({
      id,
      affiliateEmail: email,
      affiliateName: 'Júlia Andrade',
      createdAt: at,
      method,
      amount,
      paidAmount: paidAmount(amount, method),
      status: 'pago',
      paidAt: at,
      paidBy: 'George',
      commissionIds: ids,
    });
  };
  close(1, 60, 'pix');
  close(2, 30, 'credito');

  const credit = payouts.find((p) => p.method === 'credito');
  const entries: CreditEntry[] = credit
    ? [
        {
          id: 1,
          email,
          kind: 'comissao',
          amount: credit.paidAmount,
          at: credit.createdAt,
          expiresAt: new Date(credit.createdAt.getTime() + 365 * DAY),
          payoutId: credit.id,
        },
        {
          id: 2,
          email,
          kind: 'uso',
          amount: -20,
          at: ago(18),
          orderNumber: 'NP231999',
        },
      ]
    : [];
  return { commissions, payouts, entries };
}
