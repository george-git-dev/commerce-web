import { Coupon, CouponDraft } from '../models/coupon';

export type CouponStatus = 'no-ar' | 'agendado' | 'encerrado' | 'inativo' | 'esgotado';

export const COUPON_STATUS_LABELS: Record<CouponStatus, string> = {
  'no-ar': 'No ar',
  agendado: 'Agendado',
  encerrado: 'Encerrado',
  inativo: 'Inativo',
  esgotado: 'Esgotado',
};

/** Código: 3 a 20 letras/números, sem espaço nem acento. */
export const COUPON_CODE_RE = /^[A-Z0-9]{3,20}$/;

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Normaliza o que o cliente/equipe digita ("  nani10 " → "NANI10"). */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Situação hoje (`today` = `aaaa-mm-dd`). Termina no que vier primeiro: data ou usos. */
export function couponStatus(coupon: Coupon, today: string): CouponStatus {
  if (!coupon.active) return 'inativo';
  if (coupon.endsOn && coupon.endsOn < today) return 'encerrado';
  if (coupon.maxUses && coupon.uses >= coupon.maxUses) return 'esgotado';
  if (coupon.startsOn && coupon.startsOn > today) return 'agendado';
  return 'no-ar';
}

/** "10% (até R$ 50)", "R$ 30", "Frete grátis". */
export function couponDiscountLabel(
  coupon: Pick<Coupon, 'kind' | 'value' | 'maxDiscount'>,
): string {
  if (coupon.kind === 'shipping') return 'Frete grátis';
  if (coupon.kind === 'fixed') return `${brl(coupon.value)} de desconto`;
  const cap = coupon.maxDiscount ? ` (até ${brl(coupon.maxDiscount)})` : '';
  return `${coupon.value}% de desconto${cap}`;
}

/** Texto do cupom aplicado no carrinho ("10% de desconto · a partir de R$ 200"). */
export function couponDescription(coupon: Coupon): string {
  const parts = [couponDiscountLabel(coupon)];
  if (coupon.minSubtotal) parts.push(`a partir de ${brl(coupon.minSubtotal)}`);
  if (coupon.kind !== 'shipping' && !coupon.allowOnPromo) parts.push('não vale em itens em oferta');
  return parts.join(' · ');
}

/** Contexto da compra para validar o cupom. */
export interface CouponContext {
  today: string;
  /** Subtotal de todos os produtos (base do pedido mínimo). */
  subtotal: number;
  /** Subtotal dos itens em que o cupom pode descontar (sem os de oferta, se for o caso). */
  eligibleSubtotal: number;
  /** `null` = sem login (limite por cliente e 1ª compra conferidos no checkout). */
  customer: { usedThisCoupon: number; hasPurchased: boolean; isOwner?: boolean } | null;
}

/** Motivo de o cupom não valer agora (ou `null`). Mensagens para o cliente. */
export function couponProblem(coupon: Coupon, ctx: CouponContext): string | null {
  const status = couponStatus(coupon, ctx.today);
  if (status === 'inativo' || status === 'agendado') return 'Cupom inválido ou expirado.';
  if (status === 'encerrado') return 'Este cupom expirou.';
  if (status === 'esgotado') return 'Este cupom já atingiu o limite de usos.';
  if (coupon.minSubtotal && ctx.subtotal < coupon.minSubtotal) {
    return `Este cupom vale para compras a partir de ${brl(coupon.minSubtotal)}.`;
  }
  if (coupon.kind !== 'shipping' && ctx.eligibleSubtotal <= 0) {
    return 'Este cupom não vale para itens que já estão em oferta.';
  }
  if (ctx.customer) {
    if (ctx.customer.isOwner) return 'Você não pode usar o seu próprio cupom de afiliado.';
    if (coupon.firstPurchaseOnly && ctx.customer.hasPurchased) {
      return 'Este cupom é só para a primeira compra.';
    }
    if (coupon.perCustomer && ctx.customer.usedThisCoupon >= coupon.perCustomer) {
      return 'Você já usou este cupom.';
    }
  }
  return null;
}

/** Desconto nos produtos (R$), sobre o subtotal elegível, com teto. */
export function couponDiscount(coupon: Coupon, eligibleSubtotal: number): number {
  if (coupon.kind === 'shipping' || eligibleSubtotal <= 0) return 0;
  if (coupon.kind === 'fixed') return Math.min(coupon.value, eligibleSubtotal);
  const off = Math.round(eligibleSubtotal * coupon.value) / 100;
  return coupon.maxDiscount ? Math.min(off, coupon.maxDiscount) : off;
}

const positiveInt = (n: number | undefined) => n == null || (Number.isInteger(n) && n >= 1);

/** Problemas do cadastro (lista vazia = pode salvar). */
export function couponDraftProblems(draft: CouponDraft, takenCodes: readonly string[]): string[] {
  const problems: string[] = [];
  if (!COUPON_CODE_RE.test(draft.code)) {
    problems.push('Código com 3 a 20 letras ou números (sem espaço nem acento).');
  } else if (takenCodes.includes(draft.code)) {
    problems.push('Já existe um cupom com este código.');
  }
  if (draft.kind !== 'shipping') {
    if (!Number.isFinite(draft.value) || draft.value <= 0) problems.push('Informe o desconto.');
    else if (draft.kind === 'percent' && (!Number.isInteger(draft.value) || draft.value > 90)) {
      problems.push('Percentual entre 1% e 90% (número inteiro).');
    }
    if (draft.maxDiscount != null && !(draft.maxDiscount > 0)) {
      problems.push('Teto do desconto: valor maior que zero (ou deixe em branco).');
    }
    if (draft.kind === 'fixed' && draft.minSubtotal != null && draft.value >= draft.minSubtotal) {
      problems.push('O desconto fixo precisa ser menor que o pedido mínimo.');
    }
  }
  if (draft.minSubtotal != null && !(draft.minSubtotal > 0)) {
    problems.push('Pedido mínimo: valor maior que zero (ou deixe em branco).');
  }
  if (draft.startsOn && draft.endsOn && draft.endsOn < draft.startsOn) {
    problems.push('A data final precisa ser igual ou depois da inicial.');
  }
  if (!positiveInt(draft.maxUses)) problems.push('Limite total: número inteiro maior que zero.');
  if (!positiveInt(draft.perCustomer))
    problems.push('Limite por cliente: número inteiro maior que zero.');
  return problems;
}
