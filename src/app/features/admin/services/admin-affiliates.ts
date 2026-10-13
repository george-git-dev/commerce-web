import { computed, inject, Injectable } from '@angular/core';
import { Affiliate } from '../../../core/models/affiliate';
import {
  AffiliateProgram,
  AffiliateProgramSettings,
  PROGRAM_LIMITS,
  programProblems,
} from '../../../core/services/affiliate-program';
import { AffiliateService } from '../../../core/services/affiliate-service';
import { AuthService } from '../../../core/services/auth-service';
import { CouponService } from '../../../core/services/coupon-service';
import { maskPixKey, suggestAffiliateCode } from '../../../core/utils/affiliate-rules';
import { COUPON_CODE_RE, normalizeCode } from '../../../core/utils/coupon-rules';
import { AdminAudit } from './admin-audit';

/**
 * Pedidos de afiliação no backoffice (aba Pedidos em Afiliados). Aprovar cria o cupom próprio
 * (X% para quem compra, ligado à conta); reprovar exige motivo. Só com
 * `approvals:edit`; chave Pix inteira só com `customers:sensitive`.
 * Fase 2 (B7): `POST /admin/affiliates/{id}/approve|reject` — o back cria o
 * cupom na mesma transação e manda e-mail para a pessoa.
 */
/** Edição de um afiliado no backoffice. */
export interface AffiliateEdit {
  commissionPercent: number;
  discountPercent: number;
  code: string;
  /** Trocou o código de um cupom já usado: o antigo vale até esta data (vazio = desativa já). */
  oldCodeUntil?: string;
  active: boolean;
  startsOn?: string;
  endsOn?: string;
}

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
  private readonly programService = inject(AffiliateProgram);
  readonly program = this.programService.settings;
  readonly programLive = this.programService.live;
  readonly limits = PROGRAM_LIMITS;
  /** Editar afiliados e o programa: quem paga comissões (`affiliates:pay`). */
  readonly canManage = computed(() => this.auth.can('affiliates:pay'));

  pix(affiliate: Affiliate): string {
    return this.canSeePix() ? affiliate.pixKey : maskPixKey(affiliate.pixKey);
  }

  suggestCode(affiliate: Affiliate): string {
    const taken = this.coupons.all().map((c) => c.code);
    return suggestAffiliateCode(affiliate.name, this.program().buyerDiscountPercent, taken);
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
      value: this.program().buyerDiscountPercent,
      perCustomer: 1,
      firstPurchaseOnly: false,
      allowOnPromo: false,
      active: true,
      affiliateEmail: affiliate.email,
    });
    this.affiliates.decide(affiliate.id, {
      status: 'aprovado',
      couponCode: code,
      commissionPercent: this.program().commissionPercent,
      decision: { by: this.who(), at: new Date() },
    });
    this.audit.record({
      by: this.who(),
      action: 'Aprovou afiliado',
      entity: 'Afiliado',
      entityId: affiliate.profile,
      link: '/admin/afiliados',
      changes: [
        { field: 'Situação', before: 'Em análise', after: 'Aprovado' },
        { field: 'Cupom', before: '', after: `${code} (${this.program().buyerDiscountPercent}%)` },
        { field: 'Comissão', before: '', after: `${this.program().commissionPercent}%` },
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
      link: '/admin/afiliados',
      changes: [
        { field: 'Situação', before: 'Em análise', after: 'Não aprovado' },
        { field: 'Motivo', before: '', after: reason.trim() },
      ],
    });
    return true;
  }

  /** Cupom atual do afiliado (para a edição). */
  couponOf(affiliate: Affiliate) {
    return affiliate.couponCode ? this.coupons.find(affiliate.couponCode) : undefined;
  }

  /** Problemas da edição (lista vazia = pode salvar). */
  editProblems(affiliate: Affiliate, edit: AffiliateEdit): string[] {
    const problems: string[] = [];
    const pct = (n: number, max: number) => Number.isFinite(n) && n >= 0 && n <= max;
    if (!pct(edit.commissionPercent, PROGRAM_LIMITS.percentMax)) {
      problems.push(`Comissão entre 0% e ${PROGRAM_LIMITS.percentMax}%.`);
    }
    if (!pct(edit.discountPercent, PROGRAM_LIMITS.discountMax) || edit.discountPercent < 1) {
      problems.push(`Desconto do cupom entre 1% e ${PROGRAM_LIMITS.discountMax}%.`);
    }
    const code = normalizeCode(edit.code);
    if (code !== affiliate.couponCode) {
      const problem = this.codeProblem(code);
      if (problem) problems.push(problem);
    }
    if (edit.startsOn && edit.endsOn && edit.endsOn < edit.startsOn) {
      problems.push('A data final precisa ser igual ou depois da inicial.');
    }
    if (edit.oldCodeUntil && edit.oldCodeUntil < this.programService.today()) {
      problems.push('A data do cupom antigo não pode ser no passado.');
    }
    return problems;
  }

  /** Desconto + comissão alto demais (pede confirmação). */
  marginWarning(edit: Pick<AffiliateEdit, 'commissionPercent' | 'discountPercent'>): boolean {
    return edit.commissionPercent + edit.discountPercent > PROGRAM_LIMITS.marginWarning;
  }

  /**
   * Salva a edição. Trocar o código: cupom sem uso só é renomeado; com uso, nasce
   * um cupom novo e o antigo vale até `oldCodeUntil` (sem data = desativa já).
   * Comissão nova vale para vendas novas (as já feitas guardam o % da época).
   */
  update(affiliate: Affiliate, edit: AffiliateEdit): boolean {
    if (!this.canManage() || affiliate.status !== 'aprovado') return false;
    if (this.editProblems(affiliate, edit).length) return false;
    const current = this.couponOf(affiliate);
    const code = normalizeCode(edit.code);
    const changes: { field: string; before: string; after: string }[] = [];
    if (current) {
      const { id, uses, discountGiven, ...draft } = current;
      void discountGiven;
      if (code !== current.code && uses > 0) {
        this.coupons.save(null, {
          ...draft,
          code,
          value: edit.discountPercent,
          startsOn: undefined,
          endsOn: undefined,
          active: true,
        });
        this.coupons.save(
          id,
          edit.oldCodeUntil ? { ...draft, endsOn: edit.oldCodeUntil } : { ...draft, active: false },
        );
        changes.push({
          field: 'Cupom',
          before: current.code,
          after: `${code} (${current.code} ${edit.oldCodeUntil ? 'vale até ' + edit.oldCodeUntil : 'desativado'})`,
        });
      } else {
        this.coupons.save(id, { ...draft, code, value: edit.discountPercent });
        if (code !== current.code)
          changes.push({ field: 'Cupom', before: current.code, after: code });
      }
      if (current.value !== edit.discountPercent) {
        changes.push({
          field: 'Desconto do cupom',
          before: `${current.value}%`,
          after: `${edit.discountPercent}%`,
        });
      }
    }
    if (affiliate.commissionPercent !== edit.commissionPercent) {
      changes.push({
        field: 'Comissão',
        before: `${affiliate.commissionPercent}%`,
        after: `${edit.commissionPercent}%`,
      });
    }
    if (affiliate.active !== edit.active) {
      changes.push({
        field: 'Situação',
        before: affiliate.active ? 'Ativo' : 'Pausado',
        after: edit.active ? 'Ativo' : 'Pausado',
      });
    }
    const period = (a?: string, b?: string) =>
      a || b ? `${a ?? 'já'} → ${b ?? 'sem fim'}` : 'sem período';
    if (affiliate.startsOn !== edit.startsOn || affiliate.endsOn !== edit.endsOn) {
      changes.push({
        field: 'Período',
        before: period(affiliate.startsOn, affiliate.endsOn),
        after: period(edit.startsOn, edit.endsOn),
      });
    }
    this.affiliates.decide(affiliate.id, {
      couponCode: current ? code : affiliate.couponCode,
      commissionPercent: edit.commissionPercent,
      active: edit.active,
      startsOn: edit.startsOn,
      endsOn: edit.endsOn,
    });
    if (changes.length) {
      this.audit.record({
        by: this.who(),
        action: 'Alterou afiliado',
        entity: 'Afiliado',
        entityId: affiliate.profile,
        link: '/admin/afiliados',
        changes,
      });
    }
    return true;
  }

  programProblems(settings: AffiliateProgramSettings): string[] {
    return programProblems(settings);
  }

  saveProgram(settings: AffiliateProgramSettings): boolean {
    if (!this.canManage() || programProblems(settings).length) return false;
    const before = this.program();
    this.programService.save(settings);
    const onOff = (s: AffiliateProgramSettings) => (s.active ? 'Ligado' : 'Pausado');
    const period = (s: AffiliateProgramSettings) =>
      s.startsOn || s.endsOn ? `${s.startsOn ?? 'já'} → ${s.endsOn ?? 'sem fim'}` : 'sem período';
    const fields: [string, string, string][] = [
      ['Programa', onOff(before), onOff(settings)],
      ['Período', period(before), period(settings)],
      ['Desconto padrão', `${before.buyerDiscountPercent}%`, `${settings.buyerDiscountPercent}%`],
      ['Comissão padrão', `${before.commissionPercent}%`, `${settings.commissionPercent}%`],
      ['Mínimo do Pix', `R$ ${before.minPayout}`, `R$ ${settings.minPayout}`],
      [
        'Bônus do crédito',
        `${before.storeCreditBonusPercent}%`,
        `${settings.storeCreditBonusPercent}%`,
      ],
    ];
    this.audit.record({
      by: this.who(),
      action: 'Alterou o programa de afiliados',
      entity: 'Afiliado',
      entityId: 'Programa',
      link: '/admin/afiliados',
      changes: fields
        .filter(([, b, a]) => b !== a)
        .map(([field, b, a]) => ({ field, before: b, after: a })),
    });
    return true;
  }

  private who(): string {
    return this.auth.user()?.name ?? 'Equipe';
  }
}
