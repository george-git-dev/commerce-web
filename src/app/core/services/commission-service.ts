import { computed, inject, Injectable, signal } from '@angular/core';
import { commissionsMock } from '../data/commissions-mock';
import { Commission, Payout } from '../models/commission';
import { commissionAmount, planPayouts } from '../utils/commission-rules';
import { AffiliateService } from './affiliate-service';
import { AuthService } from './auth-service';
import { StoreCredit } from './store-credit';

/**
 * Comissões e pagamentos de afiliados (mock em memória). A comissão nasce com
 * o pedido feito com cupom de afiliado; a entrega libera depois do prazo; o
 * fechamento gera os pagamentos (Pix a pagar ou crédito na loja na hora).
 * Fase 2: gravada no `POST /orders`, liberada por job diário; fechamento e
 * "marcar como pago" em `/admin/affiliates/payouts` (idempotentes).
 */
@Injectable({ providedIn: 'root' })
export class CommissionService {
  private readonly auth = inject(AuthService);
  private readonly affiliates = inject(AffiliateService);
  private readonly credit = inject(StoreCredit);
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
    if (!affiliate || order.base <= 0) return;
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

  /** Fecha: cria os pagamentos das comissões liberadas. Devolve o que foi gerado. */
  close(): { created: Payout[]; carried: { affiliateEmail: string; amount: number }[] } {
    const now = this.now();
    const { plans, carried } = planPayouts(
      this.commissionState(),
      (email) => this.affiliates.approvedBy(email)?.payoutMethod ?? 'pix',
      now,
    );
    const created: Payout[] = [];
    let nextId = Math.max(0, ...this.payoutState().map((p) => p.id)) + 1;
    for (const plan of plans) {
      const id = nextId++;
      const credit = plan.method === 'credito';
      const payout: Payout = {
        id,
        affiliateEmail: plan.affiliateEmail,
        affiliateName: this.affiliates.approvedBy(plan.affiliateEmail)?.name ?? plan.affiliateEmail,
        createdAt: now,
        method: plan.method,
        amount: plan.amount,
        paidAmount: plan.paidAmount,
        status: credit ? 'pago' : 'a-pagar',
        paidAt: credit ? now : undefined,
        paidBy: credit ? 'Crédito automático' : undefined,
        commissionIds: plan.commissionIds,
      };
      if (credit) this.credit.addCommission(plan.affiliateEmail, plan.paidAmount, id);
      created.push(payout);
    }
    const paid = new Map(
      created.flatMap((p) => p.commissionIds.map((cid) => [cid, p.id] as const)),
    );
    this.commissionState.update((list) =>
      list.map((c) => (paid.has(c.id) ? { ...c, state: 'paga', payoutId: paid.get(c.id) } : c)),
    );
    this.payoutState.update((list) => [...list, ...created]);
    return { created, carried };
  }

  /** Pix feito fora do sistema: marca como pago. */
  markPaid(payoutId: number, by: string): Payout | undefined {
    const payout = this.payoutState().find((p) => p.id === payoutId);
    if (!payout || payout.status === 'pago') return undefined;
    const updated: Payout = { ...payout, status: 'pago', paidAt: new Date(), paidBy: by };
    this.payoutState.update((list) => list.map((p) => (p.id === payoutId ? updated : p)));
    return updated;
  }

  private update(orderNumber: string, change: (c: Commission) => Commission): void {
    this.commissionState.update((list) =>
      list.map((c) => (c.orderNumber === orderNumber ? change(c) : c)),
    );
  }
}
