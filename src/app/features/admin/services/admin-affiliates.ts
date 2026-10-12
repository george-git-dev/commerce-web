import { computed, inject, Injectable } from '@angular/core';
import { AFFILIATE_PROGRAM } from '../../../core/config/affiliate';
import { Affiliate } from '../../../core/models/affiliate';
import { AffiliateService } from '../../../core/services/affiliate-service';
import { AuthService } from '../../../core/services/auth-service';
import { CouponService } from '../../../core/services/coupon-service';
import { maskPixKey, suggestAffiliateCode } from '../../../core/utils/affiliate-rules';
import { COUPON_CODE_RE, normalizeCode } from '../../../core/utils/coupon-rules';
import { AdminAudit } from './admin-audit';

/**
 * Afiliados no backoffice (aba em Aprovações). Aprovar cria o cupom próprio
 * (X% para quem compra, ligado à conta); reprovar exige motivo. Só com
 * `approvals:edit`; chave Pix inteira só com `customers:sensitive`.
 * Fase 2 (B7): `POST /admin/affiliates/{id}/approve|reject` — o back cria o
 * cupom na mesma transação e manda e-mail para a pessoa.
 */
@Injectable({ providedIn: 'root' })
export class AdminAffiliates {
  private readonly affiliates = inject(AffiliateService);
  private readonly coupons = inject(CouponService);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);

  readonly all = this.affiliates.all;
  readonly pendingCount = this.affiliates.pendingCount;
  readonly canEdit = computed(() => this.auth.can('approvals:edit'));
  readonly canSeePix = computed(() => this.auth.can('customers:sensitive'));
  readonly program = AFFILIATE_PROGRAM;

  pix(affiliate: Affiliate): string {
    return this.canSeePix() ? affiliate.pixKey : maskPixKey(affiliate.pixKey);
  }

  suggestCode(affiliate: Affiliate): string {
    const taken = this.coupons.all().map((c) => c.code);
    return suggestAffiliateCode(affiliate.name, this.program.buyerDiscountPercent, taken);
  }

  /** Problema do código escolhido para o cupom (ou `null`). */
  codeProblem(raw: string): string | null {
    const code = normalizeCode(raw);
    if (!COUPON_CODE_RE.test(code)) return 'Código com 3 a 20 letras ou números, sem espaço.';
    if (this.coupons.find(code)) return 'Já existe um cupom com este código.';
    return null;
  }

  approve(affiliate: Affiliate, rawCode: string): boolean {
    const code = normalizeCode(rawCode);
    if (!this.canEdit() || affiliate.status !== 'pendente' || this.codeProblem(code)) return false;
    this.coupons.save(null, {
      code,
      kind: 'percent',
      value: this.program.buyerDiscountPercent,
      perCustomer: 1,
      firstPurchaseOnly: false,
      allowOnPromo: false,
      active: true,
      affiliateEmail: affiliate.email,
    });
    this.affiliates.decide(affiliate.id, {
      status: 'aprovado',
      couponCode: code,
      decision: { by: this.who(), at: new Date() },
    });
    this.audit.record({
      by: this.who(),
      action: 'Aprovou afiliado',
      entity: 'Afiliado',
      entityId: affiliate.profile,
      link: '/admin/aprovacoes/afiliados',
      changes: [
        { field: 'Situação', before: 'Em análise', after: 'Aprovado' },
        { field: 'Cupom', before: '', after: `${code} (${this.program.buyerDiscountPercent}%)` },
        { field: 'Comissão', before: '', after: `${affiliate.commissionPercent}%` },
      ],
    });
    return true;
  }

  reject(affiliate: Affiliate, reason: string): boolean {
    if (!this.canEdit() || affiliate.status !== 'pendente' || reason.trim().length < 5)
      return false;
    this.affiliates.decide(affiliate.id, {
      status: 'reprovado',
      decision: { by: this.who(), at: new Date(), reason: reason.trim() },
    });
    this.audit.record({
      by: this.who(),
      action: 'Reprovou afiliado',
      entity: 'Afiliado',
      entityId: affiliate.profile,
      link: '/admin/aprovacoes/afiliados',
      changes: [
        { field: 'Situação', before: 'Em análise', after: 'Não aprovado' },
        { field: 'Motivo', before: '', after: reason.trim() },
      ],
    });
    return true;
  }

  private who(): string {
    return this.auth.user()?.name ?? 'Equipe';
  }
}
