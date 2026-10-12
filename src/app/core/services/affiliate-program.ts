import { computed, Injectable, signal } from '@angular/core';
import { AFFILIATE_PROGRAM } from '../config/affiliate';
import { isoDay } from '../utils/storefront-rules';

/** Regras do programa editáveis no backoffice (Afiliados → Configurações). */
export interface AffiliateProgramSettings {
  /** Programa ligado. Desligado: "Seja afiliado" some e os cupons de afiliado param de valer. */
  active: boolean;
  /** Período opcional (`aaaa-mm-dd`). */
  startsOn?: string;
  endsOn?: string;
  /** Padrões para quem for aprovado daqui pra frente. */
  buyerDiscountPercent: number;
  commissionPercent: number;
  minPayout: number;
  storeCreditBonusPercent: number;
}

/** Limites aceitos nas configurações e na edição do afiliado. */
export const PROGRAM_LIMITS = {
  percentMax: 50,
  discountMax: 50,
  bonusMax: 50,
  /** Desconto + comissão acima disso pede confirmação (come a margem). */
  marginWarning: 30,
} as const;

/**
 * Programa de afiliados: liga/desliga (com período) e valores padrão (mock em
 * memória). Fixos no código: prazo de liberação (CDC) e validade do crédito.
 * Fase 2: `GET /affiliate-program` (público: só se está no ar) e
 * `PUT /admin/affiliate-program` (auditado).
 */
@Injectable({ providedIn: 'root' })
export class AffiliateProgram {
  private readonly state = signal<AffiliateProgramSettings>({
    active: true,
    buyerDiscountPercent: AFFILIATE_PROGRAM.buyerDiscountPercent,
    commissionPercent: AFFILIATE_PROGRAM.commissionPercent,
    minPayout: AFFILIATE_PROGRAM.minPayout,
    storeCreditBonusPercent: AFFILIATE_PROGRAM.storeCreditBonusPercent,
  });
  readonly today = signal(isoDay(new Date()));

  /** Valores atuais + os fixos (para as telas). */
  readonly settings = computed(() => ({
    ...this.state(),
    holdDays: AFFILIATE_PROGRAM.holdDays,
    storeCreditValidityMonths: AFFILIATE_PROGRAM.storeCreditValidityMonths,
  }));

  /** No ar agora: ligado e dentro do período. */
  readonly live = computed(() => {
    const s = this.state();
    const today = this.today();
    return s.active && (!s.startsOn || s.startsOn <= today) && (!s.endsOn || s.endsOn >= today);
  });

  save(settings: AffiliateProgramSettings): void {
    this.state.set({ ...settings });
  }
}

/** Problemas das configurações (lista vazia = pode salvar). */
export function programProblems(s: AffiliateProgramSettings): string[] {
  const problems: string[] = [];
  const pct = (n: number, max: number) => Number.isFinite(n) && n >= 0 && n <= max;
  if (!pct(s.buyerDiscountPercent, PROGRAM_LIMITS.discountMax)) {
    problems.push(`Desconto do cupom entre 0% e ${PROGRAM_LIMITS.discountMax}%.`);
  }
  if (!pct(s.commissionPercent, PROGRAM_LIMITS.percentMax)) {
    problems.push(`Comissão entre 0% e ${PROGRAM_LIMITS.percentMax}%.`);
  }
  if (!Number.isFinite(s.minPayout) || s.minPayout < 0) problems.push('Mínimo do Pix inválido.');
  if (!pct(s.storeCreditBonusPercent, PROGRAM_LIMITS.bonusMax)) {
    problems.push(`Bônus do crédito entre 0% e ${PROGRAM_LIMITS.bonusMax}%.`);
  }
  if (s.startsOn && s.endsOn && s.endsOn < s.startsOn) {
    problems.push('A data final precisa ser igual ou depois da inicial.');
  }
  return problems;
}
