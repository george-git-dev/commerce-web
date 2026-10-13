import { computed, inject, Injectable } from '@angular/core';
import { Coupon, CouponDraft } from '../../../core/models/coupon';
import { AuthService } from '../../../core/services/auth-service';
import { CouponService } from '../../../core/services/coupon-service';
import {
  COUPON_STATUS_LABELS,
  couponDiscountLabel,
  couponDraftProblems,
  couponStatus,
} from '../../../core/utils/coupon-rules';
import { AdminAudit } from './admin-audit';

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Cupons no backoffice: lista, cadastro com validação, excluir (só sem uso) e
 * auditoria. Ver: `products:view`; mexer: `products:edit`.
 * Fase 2 (B6/B7): `GET/POST/PUT/DELETE /admin/coupons`; o uso é contado pelo
 * back no `POST /orders` (`coupon_usage`), com trava no limite.
 */
@Injectable({ providedIn: 'root' })
export class AdminCoupons {
  private readonly coupons = inject(CouponService);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);

  readonly all = this.coupons.all;
  readonly today = this.coupons.today;
  readonly canEdit = computed(() => this.auth.can('products:edit'));

  find(id: number): Coupon | undefined {
    return this.all().find((coupon) => coupon.id === id);
  }

  status(coupon: Coupon) {
    return couponStatus(coupon, this.today());
  }

  statusLabel(coupon: Coupon): string {
    return COUPON_STATUS_LABELS[this.status(coupon)];
  }

  /** "10% de desconto · mín. R$ 200 · 1ª compra". */
  summary(coupon: CouponDraft): string {
    const parts = [couponDiscountLabel(coupon)];
    if (coupon.minSubtotal) parts.push(`mín. ${brl(coupon.minSubtotal)}`);
    if (coupon.firstPurchaseOnly) parts.push('1ª compra');
    if (coupon.kind !== 'shipping' && coupon.allowOnPromo) parts.push('vale em oferta');
    if (coupon.affiliateEmail) parts.push('cupom de afiliado');
    return parts.join(' · ');
  }

  problems(id: number | null, draft: CouponDraft): string[] {
    const taken = this.all()
      .filter((coupon) => coupon.id !== id)
      .map((coupon) => coupon.code);
    return couponDraftProblems(draft, taken);
  }

  save(id: number | null, draft: CouponDraft): number {
    if (!this.canEdit()) return id ?? 0;
    const before = id == null ? undefined : this.find(id);
    const savedId = this.coupons.save(id, draft);
    const period = (c?: Pick<Coupon, 'startsOn' | 'endsOn'>) =>
      c ? `${c.startsOn ?? 'já'} → ${c.endsOn ?? 'sem fim'}` : '';
    const limits = (c?: CouponDraft) =>
      c ? `total ${c.maxUses ?? 'sem limite'} · por cliente ${c.perCustomer ?? 'sem limite'}` : '';
    const fields: [string, string, string][] = [
      ['Código', before?.code ?? '', draft.code],
      ['Desconto', before ? this.summary(before) : '', this.summary(draft)],
      ['Período', period(before), period(draft)],
      ['Limite de usos', limits(before), limits(draft)],
      ['Ativo', before ? (before.active ? 'Sim' : 'Não') : '', draft.active ? 'Sim' : 'Não'],
    ];
    this.audit.record({
      by: this.auth.user()?.name ?? 'Equipe',
      action: before ? 'Alterou cupom' : 'Criou cupom',
      entity: 'Cupom',
      entityId: draft.code,
      link: `/admin/promocoes/cupons/${savedId}`,
      changes: fields
        .filter(([, b, a]) => b !== a)
        .map(([field, b, a]) => ({ field, before: b, after: a })),
    });
    return savedId;
  }

  /** Só cupom nunca usado (o usado fica no histórico dos pedidos: desative). */
  remove(id: number): boolean {
    const coupon = this.find(id);
    if (!coupon || coupon.uses > 0 || !this.canEdit()) return false;
    this.coupons.delete(id);
    this.audit.record({
      by: this.auth.user()?.name ?? 'Equipe',
      action: 'Excluiu cupom',
      entity: 'Cupom',
      entityId: coupon.code,
      changes: [{ field: 'Desconto', before: this.summary(coupon), after: '' }],
    });
    return true;
  }
}
