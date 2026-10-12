import { AccountDirectory } from './account-directory';
import { hasPermission } from '../config/permissions';
import { computed, inject, Injectable, signal } from '@angular/core';
import { AFFILIATES_MOCK } from '../data/affiliates-mock';
import { ActionResult } from '../models/auth';
import { Affiliate, AffiliateDraft } from '../models/affiliate';
import { PayoutMethod } from '../models/commission';
import { affiliateDraftProblems, REAPPLY_AFTER_DAYS } from '../utils/affiliate-rules';
import { AffiliateProgram } from './affiliate-program';
import { AuthService } from './auth-service';

const DAY = 86_400_000;

/**
 * Programa de afiliados (mock em memória — chave Pix NUNCA vai para o
 * navegador). A conta logada pede para participar; o backoffice aprova
 * (`AdminAffiliates`, que cria o cupom) ou reprova.
 * Fase 2: `POST /me/affiliate`, `GET /me/affiliate` e `/admin/affiliates/*`.
 */
@Injectable({ providedIn: 'root' })
export class AffiliateService {
  private readonly auth = inject(AuthService);
  private readonly program = inject(AffiliateProgram);
  private readonly directory = inject(AccountDirectory);
  private readonly state = signal<readonly Affiliate[]>(AFFILIATES_MOCK);

  readonly all = this.state.asReadonly();
  readonly pendingCount = computed(
    () => this.state().filter((a) => a.status === 'pendente').length,
  );

  /** Pedido/cadastro da conta logada (o mais recente). */
  readonly mine = computed(() => {
    const email = this.auth.user()?.email;
    if (!email) return undefined;
    return this.state()
      .filter((a) => a.email === email)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  });

  /** Data a partir da qual quem não foi aprovado pode pedir de novo. */
  readonly reapplyFrom = computed(() => {
    const mine = this.mine();
    return mine?.status === 'reprovado' && mine.decision
      ? new Date(mine.decision.at.getTime() + REAPPLY_AFTER_DAYS * DAY)
      : null;
  });

  /** Motivo de não poder pedir agora (ou `null`). */
  applyBlock(now = new Date()): string | null {
    const user = this.auth.user();
    if (!user) return 'Entre na sua conta.';
    if (!this.program.live()) return 'O programa de afiliados está pausado no momento.';
    if (hasPermission(user.roles, 'admin:access')) {
      return 'Contas da equipe não participam do programa de afiliados.';
    }
    const mine = this.mine();
    if (mine?.status === 'pendente') return 'Seu pedido já está em análise.';
    if (mine?.status === 'aprovado') return 'Você já é afiliado.';
    const from = this.reapplyFrom();
    if (from && now < from)
      return `Você pode pedir de novo a partir de ${from.toLocaleDateString('pt-BR')}.`;
    return null;
  }

  apply(draft: AffiliateDraft, acceptedTerms: boolean): ActionResult {
    const block = this.applyBlock();
    if (block) return { ok: false, message: block };
    const problems = affiliateDraftProblems(draft, acceptedTerms);
    if (problems.length) return { ok: false, message: problems[0] };
    const user = this.auth.user()!;
    const now = new Date();
    this.state.update((list) => [
      ...list,
      {
        id: Math.max(0, ...list.map((a) => a.id)) + 1,
        email: user.email,
        name: user.name,
        channel: draft.channel,
        profile: draft.profile.trim(),
        pitch: draft.pitch.trim(),
        pixKey: draft.pixKey.trim(),
        acceptedTermsAt: now,
        createdAt: now,
        status: 'pendente',
        commissionPercent: this.program.settings().commissionPercent,
        payoutMethod: 'pix',
        active: true,
      },
    ]);
    return { ok: true };
  }

  /** Afiliado escolhe como receber no próximo fechamento. */
  setPayoutMethod(method: PayoutMethod): void {
    const mine = this.mine();
    if (mine?.status !== 'aprovado') return;
    this.decide(mine.id, { payoutMethod: method });
  }

  /** A participação desta pessoa está valendo agora (programa no ar + ativa + período). */
  isLive(affiliate: Affiliate | undefined): boolean {
    if (!affiliate || affiliate.status !== 'aprovado' || !affiliate.active) return false;
    if (!this.program.live()) return false;
    const today = this.program.today();
    return (
      (!affiliate.startsOn || affiliate.startsOn <= today) &&
      (!affiliate.endsOn || affiliate.endsOn >= today)
    );
  }

  /** Cupom/comissão desta conta valem agora? */
  participating(email: string): boolean {
    return this.isLive(this.approvedBy(email));
  }

  /** Afiliado aprovado pelo e-mail (para comissão e fechamento). */
  approvedBy(email: string): Affiliate | undefined {
    return this.state().find((a) => a.email === email && a.status === 'aprovado');
  }

  /** Decisão do backoffice (quem chama valida a permissão e audita). */
  decide(
    id: number,
    change: Partial<
      Pick<
        Affiliate,
        | 'status'
        | 'couponCode'
        | 'commissionPercent'
        | 'decision'
        | 'payoutMethod'
        | 'active'
        | 'startsOn'
        | 'endsOn'
      >
    >,
  ): void {
    this.state.update((list) => list.map((a) => (a.id === id ? { ...a, ...change } : a)));
    // Aprovado ganha `ROLE_AFFILIATE`; não aprovado fica só cliente.
    if (change.status) {
      const affiliate = this.state().find((a) => a.id === id);
      if (affiliate) this.directory.setAffiliate(affiliate.email, change.status === 'aprovado');
    }
  }
}
