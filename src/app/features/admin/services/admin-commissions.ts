import { computed, inject, Injectable } from '@angular/core';
import { Affiliate } from '../../../core/models/affiliate';
import {
  Commission,
  PAYOUT_METHOD_LABELS,
  Payout,
  PayoutReceipt,
} from '../../../core/models/commission';
import { AffiliateProgram } from '../../../core/services/affiliate-program';
import { AffiliateService } from '../../../core/services/affiliate-service';
import { AuthService } from '../../../core/services/auth-service';
import { CommissionService } from '../../../core/services/commission-service';
import { StoreCredit } from '../../../core/services/store-credit';
import { maskPixKey } from '../../../core/utils/affiliate-rules';
import {
  commissionStatus,
  commissionTotals,
  payoutPreview,
  receiptProblem,
} from '../../../core/utils/commission-rules';
import { AdminAudit } from './admin-audit';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Afiliados no backoffice: totais por afiliado, comissões e pagamentos.
 * Ver: `affiliates:view`; pagar (por afiliado): `affiliates:pay`.
 * Fase 2 (B7): `GET /admin/affiliates/commissions|payouts`,
 * `POST /admin/affiliates/{id}/payouts` (multipart com comprovante; idempotente, auditado).
 */
@Injectable({ providedIn: 'root' })
export class AdminCommissions {
  private readonly service = inject(CommissionService);
  private readonly affiliates = inject(AffiliateService);
  private readonly credit = inject(StoreCredit);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);

  private readonly programService = inject(AffiliateProgram);
  readonly program = this.programService.settings;
  readonly commissions = this.service.commissions;
  readonly payouts = this.service.payouts;
  readonly now = this.service.now;
  readonly canPay = computed(() => this.auth.can('affiliates:pay'));
  readonly canSeePix = computed(() => this.auth.can('customers:sensitive'));

  status(c: Commission) {
    return commissionStatus(c, this.now());
  }

  readonly totals = computed(() => {
    const t = commissionTotals(this.commissions(), this.now());
    const paid = this.payouts().reduce((total, p) => total + p.paidAmount, 0);
    return { ...t, paid: Math.round(paid * 100) / 100 };
  });

  /** Afiliados aprovados com vendas, totais e como querem receber. */
  readonly rows = computed(() => {
    const now = this.now();
    return this.affiliates
      .all()
      .filter((a) => a.status === 'aprovado')
      .map((a) => {
        const list = this.commissions().filter((c) => c.affiliateEmail === a.email);
        const valid = list.filter((c) => c.state !== 'cancelada');
        return {
          affiliate: a,
          live: this.affiliates.isLive(a),
          sales: valid.length,
          revenue: Math.round(valid.reduce((s, c) => s + c.base, 0) * 100) / 100,
          totals: commissionTotals(list, now),
          credit: this.credit.balanceOf(a.email),
        };
      })
      .sort((x, y) => y.revenue - x.revenue);
  });

  nameOf(email: string): string {
    return this.affiliates.all().find((a) => a.email === email)?.name ?? email;
  }

  pixOf(email: string): string {
    const key = this.affiliates.approvedBy(email)?.pixKey ?? '';
    return this.canSeePix() ? key : maskPixKey(key);
  }

  methodLabel(item: { method: Payout['method'] } | { payoutMethod: Payout['method'] }): string {
    return PAYOUT_METHOD_LABELS['method' in item ? item.method : item.payoutMethod];
  }

  /** O que este afiliado tem para receber agora (pela forma que ele escolheu). */
  preview(affiliate: Affiliate) {
    return payoutPreview(
      this.commissions(),
      affiliate.email,
      affiliate.payoutMethod,
      this.now(),
      this.program(),
    );
  }

  /** Chave Pix inteira para quem vai pagar (só com `affiliates:pay`). */
  pixToPay(affiliate: Affiliate): string {
    return this.canPay() ? affiliate.pixKey : maskPixKey(affiliate.pixKey);
  }

  pay(affiliate: Affiliate, receipt?: PayoutReceipt): Payout | null {
    if (!this.canPay()) return null;
    if (affiliate.payoutMethod === 'pix' && receiptProblem(receipt ?? null)) return null;
    const payout = this.service.pay(affiliate.email, this.who(), receipt);
    if (!payout) return null;
    this.audit.record({
      by: this.who(),
      action: payout.method === 'credito' ? 'Pagou comissão em crédito' : 'Pagou comissão por Pix',
      entity: 'Pagamento de afiliado',
      entityId: payout.affiliateName,
      link: '/admin/afiliados',
      changes: [
        {
          field: 'Comissões',
          before: '',
          after: `${payout.commissionIds.length} (${brl(payout.amount)})`,
        },
        { field: PAYOUT_METHOD_LABELS[payout.method], before: '', after: brl(payout.paidAmount) },
        ...(payout.receipt
          ? [{ field: 'Comprovante', before: '', after: payout.receipt.name }]
          : []),
      ],
    });
    return payout;
  }

  private who(): string {
    return this.auth.user()?.name ?? 'Equipe';
  }
}
