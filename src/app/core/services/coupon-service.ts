import { Injectable, signal } from '@angular/core';
import { Coupon } from '../models/coupon';

/** Cupons fictícios para testar os cálculos. Na Fase 2 quem valida é o back. */
const COUPONS_MOCK: readonly Coupon[] = [
  { code: 'NANI10', description: '10% de desconto nos produtos', kind: 'percent', value: 10 },
  {
    code: 'BEMVINDO30',
    description: 'R$ 30 de desconto em compras a partir de R$ 200',
    kind: 'fixed',
    value: 30,
    minSubtotal: 200,
  },
  {
    code: 'FRETEGRATIS',
    description: 'Frete grátis em qualquer entrega',
    kind: 'shipping',
    value: 0,
  },
];

export type CouponResult = { ok: true; coupon: Coupon } | { ok: false; message: string };

/**
 * Cupom aplicado na sessão. Hoje valida contra o mock; na Fase 2 vira
 * `POST /cart/coupon` e o desconto final é calculado no back (nunca confiar no front).
 */
@Injectable({ providedIn: 'root' })
export class CouponService {
  readonly applied = signal<Coupon | null>(null);

  apply(rawCode: string, subtotal: number): CouponResult {
    const code = rawCode.trim().toUpperCase();
    if (!code) return { ok: false, message: 'Digite o código do cupom.' };
    const coupon = COUPONS_MOCK.find((item) => item.code === code);
    if (!coupon) return { ok: false, message: 'Cupom inválido ou expirado.' };
    const problem = this.problem(coupon, subtotal);
    if (problem) return { ok: false, message: problem };
    this.applied.set(coupon);
    return { ok: true, coupon };
  }

  remove(): void {
    this.applied.set(null);
  }

  /** Motivo de o cupom não valer para este subtotal (ou `null` se vale). */
  problem(coupon: Coupon, subtotal: number): string | null {
    if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
      const min = coupon.minSubtotal.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      return `Este cupom vale para compras a partir de ${min}.`;
    }
    return null;
  }

  /** Desconto sobre os produtos (R$), sem passar do subtotal. */
  productDiscount(coupon: Coupon | null, subtotal: number): number {
    if (!coupon || this.problem(coupon, subtotal)) return 0;
    if (coupon.kind === 'percent') return Math.round(subtotal * coupon.value) / 100;
    if (coupon.kind === 'fixed') return Math.min(coupon.value, subtotal);
    return 0;
  }
}
