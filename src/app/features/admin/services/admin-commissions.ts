import { computed, inject, Injectable } from '@angular/core';
import { AFFILIATE_PROGRAM } from '../../../core/config/affiliate';
import { Commission, PAYOUT_METHOD_LABELS, Payout } from '../../../core/models/commission';
import { AffiliateService } from '../../../core/services/affiliate-service';
import { AuthService } from '../../../core/services/auth-service';
import { CommissionService } from '../../../core/services/commission-service';
import { StoreCredit } from '../../../core/services/store-credit';
import { maskPixKey } from '../../../core/utils/affiliate-rules';
import { commissionStatus, commissionTotals } from '../../../core/utils/commission-rules';
import { AdminAudit } from './admin-audit';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Afiliados no backoffice: totais por afiliado, comissões e pagamentos.
 * Ver: `affiliates:view`; fechar e marcar Pix pago: `affiliates:pay`.
 * Fase 2 (B7): `GET /admin/affiliates/commissions|payouts`,
 * `POST /admin/affiliates/payouts/close` e `/{id}/paid` (idempotentes, auditados).
 */
@Injectable({ providedIn: 'root' })
export class AdminCommissions {
  private readonly service = inject(CommissionService);
  private readonly affiliates = inject(AffiliateService);
  private readonly credit = inject(StoreCredit);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);

  readonly program = AFFILIATE_PROGRAM;
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
    const sum = (status: Payout['status']) =>
      Math.round(
        this.payouts()
          .filter((p) => p.status === status)
          .reduce((total, p) => total + p.paidAmount, 0) * 100,
      ) / 100;
    return { ...t, toPay: sum('a-pagar'), paid: sum('pago') };
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

  methodLabel(payout: Pick<Payout, 'method'>): string {
    return PAYOUT_METHOD_LABELS[payout.method];
  }

  /** Prévia do fechamento (o que vai ser gerado agora). */
  readonly closingPreview = computed(() => {
    const liberated = this.commissions().filter((c) => this.status(c) === 'liberada');
    return {
      count: liberated.length,
      amount: Math.round(liberated.reduce((s, c) => s + c.amount, 0) * 100) / 100,
    };
  });

  close() {
    if (!this.canPay()) return null;
    const result = this.service.close();
    for (const payout of result.created) {
      this.audit.record({
        by: this.who(),
        action:
          payout.method === 'credito' ? 'Pagou comissão em crédito' : 'Gerou pagamento de comissão',
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
        ],
      });
    }
    return result;
  }

  markPaid(payout: Payout): boolean {
    if (!this.canPay()) return false;
    const updated = this.service.markPaid(payout.id, this.who());
    if (!updated) return false;
    this.audit.record({
      by: this.who(),
      action: 'Marcou Pix de comissão como pago',
      entity: 'Pagamento de afiliado',
      entityId: payout.affiliateName,
      link: '/admin/afiliados',
      changes: [{ field: 'Pix', before: `A pagar ${brl(payout.paidAmount)}`, after: 'Pago' }],
    });
    return true;
  }

  private who(): string {
    return this.auth.user()?.name ?? 'Equipe';
  }
}
