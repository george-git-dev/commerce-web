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

/**
 * O que um afiliado tem para receber agora: comissões liberadas ainda não
 * pagas. Pix abaixo do mínimo não paga (acumula); crédito não tem mínimo.
 */
export function payoutPreview(
  commissions: readonly Commission[],
  email: string,
  method: PayoutMethod,
  now: Date,
) {
  const list = commissions.filter(
    (c) => c.affiliateEmail === email && commissionStatus(c, now) === 'liberada',
  );
  const amount = round2(list.reduce((sum, c) => sum + c.amount, 0));
  return {
    method,
    amount,
    paidAmount: paidAmount(amount, method),
    commissionIds: list.map((c) => c.id),
    belowMinimum: method === 'pix' && amount < AFFILIATE_PROGRAM.minPayout,
  };
}

/** Comprovante: PDF ou imagem, até 5 MB. */
export const RECEIPT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

export function receiptProblem(file: { type: string; size: number } | null): string | null {
  if (!file) return 'Anexe o comprovante do Pix (PDF ou imagem).';
  if (!RECEIPT_TYPES.includes(file.type)) return 'Comprovante em PDF, JPG, PNG ou WEBP.';
  if (file.size > RECEIPT_MAX_BYTES) return 'Comprovante com no máximo 5 MB.';
  return null;
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
