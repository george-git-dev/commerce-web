import { AFFILIATE_PROGRAM } from '../config/affiliate';
import { Commission, CommissionStatus, CreditEntry, PayoutMethod } from '../models/commission';

const DAY = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  pendente: 'Pendente',
  liberada: 'Liberada',
  // Entrou num fechamento (o pagamento em si — Pix feito ou crédito lançado — está em Pagamentos).
  paga: 'Fechada',
  cancelada: 'Cancelada',
};

/** Comissão do pedido: % sobre os produtos com desconto (sem frete). */
export function commissionAmount(base: number, percent: number): number {
  return round2((base * percent) / 100);
}

/** Quando a comissão é liberada (entrega + prazo de arrependimento). */
export function releaseDate(commission: Commission): Date | null {
  return commission.deliveredAt
    ? new Date(commission.deliveredAt.getTime() + AFFILIATE_PROGRAM.holdDays * DAY)
    : null;
}

export function commissionStatus(commission: Commission, now: Date): CommissionStatus {
  if (commission.state === 'cancelada') return 'cancelada';
  if (commission.state === 'paga') return 'paga';
  const release = releaseDate(commission);
  return release && release <= now ? 'liberada' : 'pendente';
}

/** Totais por situação. */
export function commissionTotals(list: readonly Commission[], now: Date) {
  const totals: Record<CommissionStatus, number> = {
    pendente: 0,
    liberada: 0,
    paga: 0,
    cancelada: 0,
  };
  for (const c of list) totals[commissionStatus(c, now)] += c.amount;
  for (const key of Object.keys(totals) as CommissionStatus[]) totals[key] = round2(totals[key]);
  return totals;
}

/** O que a pessoa recebe: Pix = valor; crédito = valor + bônus. */
export function paidAmount(amount: number, method: PayoutMethod): number {
  return method === 'credito'
    ? round2(amount * (1 + AFFILIATE_PROGRAM.storeCreditBonusPercent / 100))
    : round2(amount);
}

export interface PayoutPlan {
  affiliateEmail: string;
  method: PayoutMethod;
  amount: number;
  paidAmount: number;
  commissionIds: number[];
}

/**
 * Fechamento: junta as comissões LIBERADAS ainda não pagas, por afiliado.
 * Pix abaixo do mínimo fica para o próximo fechamento (acumula); crédito não
 * tem mínimo. Idempotente: comissão paga não entra de novo.
 */
export function planPayouts(
  commissions: readonly Commission[],
  methodOf: (email: string) => PayoutMethod,
  now: Date,
): { plans: PayoutPlan[]; carried: { affiliateEmail: string; amount: number }[] } {
  const byAffiliate = new Map<string, Commission[]>();
  for (const c of commissions) {
    if (commissionStatus(c, now) !== 'liberada') continue;
    byAffiliate.set(c.affiliateEmail, [...(byAffiliate.get(c.affiliateEmail) ?? []), c]);
  }
  const plans: PayoutPlan[] = [];
  const carried: { affiliateEmail: string; amount: number }[] = [];
  for (const [email, list] of byAffiliate) {
    const amount = round2(list.reduce((sum, c) => sum + c.amount, 0));
    const method = methodOf(email);
    if (method === 'pix' && amount < AFFILIATE_PROGRAM.minPayout) {
      carried.push({ affiliateEmail: email, amount });
      continue;
    }
    plans.push({
      affiliateEmail: email,
      method,
      amount,
      paidAmount: paidAmount(amount, method),
      commissionIds: list.map((c) => c.id),
    });
  }
  return { plans, carried };
}

/**
 * Saldo do crédito na loja: entradas ainda válidas + usos/estornos. Simplificado
 * (o back consome por ordem de vencimento, FIFO, e lança o vencimento no extrato).
 */
export function creditBalance(entries: readonly CreditEntry[], now: Date): number {
  const total = entries.reduce(
    (sum, e) => (e.kind === 'comissao' && e.expiresAt && e.expiresAt < now ? sum : sum + e.amount),
    0,
  );
  return Math.max(0, round2(total));
}
