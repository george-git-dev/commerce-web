import { computed, inject, Injectable, signal } from '@angular/core';
import { commissionsMock } from '../data/commissions-mock';
import { Commission, Payout, PayoutReceipt } from '../models/commission';
import { commissionAmount, payoutPreview } from '../utils/commission-rules';
import { AffiliateProgram } from './affiliate-program';
import { AffiliateService } from './affiliate-service';
import { AuthService } from './auth-service';
import { StoreCredit } from './store-credit';

/**
 * Comissões e pagamentos de afiliados (mock em memória). A comissão nasce com
 * o pedido feito com cupom de afiliado; a entrega libera depois do prazo; a
 * equipe paga por afiliado (Pix com comprovante ou crédito na loja na hora).
 * Fase 2: gravada no `POST /orders`, liberada por job diário; pagamento em
 * `POST /admin/affiliates/{id}/payouts` (multipart com o comprovante; idempotente).
 */
@Injectable({ providedIn: 'root' })
export class CommissionService {
  private readonly auth = inject(AuthService);
  private readonly affiliates = inject(AffiliateService);
  private readonly credit = inject(StoreCredit);
  private readonly program = inject(AffiliateProgram);
  private readonly seed = commissionsMock();
  private readonly commissionState = signal<readonly Commission[]>(this.seed.commissions);
  private readonly payoutState = signal<readonly Payout[]>(this.seed.payouts);

  readonly commissions = this.commissionState.asReadonly();
  readonly payouts = this.payoutState.asReadonly();
  readonly now = signal(new Date());

  /** Da conta logada (afiliado). */
  readonly mine = computed(() => {
    const email = this.auth.user()?.email;
    return this.commissionState()
      .filter((c) => c.affiliateEmail === email)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  });
  readonly myPayouts = computed(() => {
    const email = this.auth.user()?.email;
    return this.payoutState()
      .filter((p) => p.affiliateEmail === email)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  });

  /** Pedido criado com cupom de afiliado: comissão pendente (snapshot do %). */
  register(order: {
    number: string;
    couponCode: string;
    affiliateEmail: string;
    base: number;
  }): void {
    const affiliate = this.affiliates.approvedBy(order.affiliateEmail);
    if (!affiliate || !this.affiliates.isLive(affiliate) || order.base <= 0) return;
    if (this.commissionState().some((c) => c.orderNumber === order.number)) return;
    this.commissionState.update((list) => [
      ...list,
      {
        id: Math.max(0, ...list.map((c) => c.id)) + 1,
        affiliateEmail: order.affiliateEmail,
        couponCode: order.couponCode,
        orderNumber: order.number,
        createdAt: new Date(),
        base: order.base,
        percent: affiliate.commissionPercent,
        amount: commissionAmount(order.base, affiliate.commissionPercent),
        state: 'aberta',
      },
    ]);
  }

  /** Pedido entregue: começa a contar o prazo de liberação. */
  markDelivered(orderNumber: string, at = new Date()): void {
    this.update(orderNumber, (c) => (c.state === 'aberta' ? { ...c, deliveredAt: at } : c));
  }

  /** Pedido cancelado/devolvido: comissão cancelada (se ainda não foi paga). */
  cancelByOrder(orderNumber: string): boolean {
    let changed = false;
    this.update(orderNumber, (c) => {
      if (c.state !== 'aberta') return c;
      changed = true;
      return { ...c, state: 'cancelada' };
    });
    return changed;
  }

  /**
   * Paga as comissões liberadas de UM afiliado: Pix (com comprovante, feito
   * fora do sistema) ou crédito na loja (lançado na hora, com bônus).
   * Idempotente: o que já foi pago não entra de novo.
   */
  pay(email: string, by: string, receipt?: PayoutReceipt): Payout | null {
    const affiliate = this.affiliates.approvedBy(email);
    if (!affiliate) return null;
    const now = new Date();
    const plan = payoutPreview(
      this.commissionState(),
      email,
      affiliate.payoutMethod,
      this.now(),
      this.program.settings(),
    );
    if (!plan.commissionIds.length || plan.belowMinimum) return null;
    if (plan.method === 'pix' && !receipt) return null;
    const id = Math.max(0, ...this.payoutState().map((p) => p.id)) + 1;
    const payout: Payout = {
      id,
      affiliateEmail: email,
      affiliateName: affiliate.name,
      createdAt: now,
      method: plan.method,
      amount: plan.amount,
      paidAmount: plan.paidAmount,
      paidAt: now,
      paidBy: by,
      receipt: plan.method === 'pix' ? receipt : undefined,
      commissionIds: plan.commissionIds,
    };
    if (plan.method === 'credito') this.credit.addCommission(email, plan.paidAmount, id);
    const ids = new Set(plan.commissionIds);
    this.commissionState.update((list) =>
      list.map((c) => (ids.has(c.id) ? { ...c, state: 'paga', payoutId: id } : c)),
    );
    this.payoutState.update((list) => [...list, payout]);
    return payout;
  }

  private update(orderNumber: string, change: (c: Commission) => Commission): void {
    this.commissionState.update((list) =>
      list.map((c) => (c.orderNumber === orderNumber ? change(c) : c)),
    );
  }
}
