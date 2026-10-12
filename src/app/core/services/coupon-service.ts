import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { COUPONS_MOCK } from '../data/coupons-mock';
import { Coupon, CouponDraft } from '../models/coupon';
import { readJson, writeJson } from '../utils/browser-storage';
import { couponDiscount, couponProblem, normalizeCode } from '../utils/coupon-rules';
import { isoDay } from '../utils/storefront-rules';
import { AffiliateService } from './affiliate-service';
import { AuthService } from './auth-service';
import { CartStore } from './cart-store';
import { OrderService } from './order-service';

const COUPON_STORAGE_KEY = 'nani.coupon.v1';

export type CouponResult = { ok: true; coupon: Coupon } | { ok: false; message: string };

/**
 * Cupons: cadastro (mock em memória, editado pelo backoffice via
 * `AdminCoupons`) e o cupom aplicado na sessão. No navegador fica só o
 * CÓDIGO; regras e valores vêm do cadastro. Fase 2: `POST /cart/coupon` é
 * prévia e o back recalcula o desconto e conta o uso no `POST /orders`.
 */
@Injectable({ providedIn: 'root' })
export class CouponService {
  private readonly cart = inject(CartStore);
  private readonly auth = inject(AuthService);
  private readonly orders = inject(OrderService);
  private readonly affiliates = inject(AffiliateService);

  private readonly state = signal<readonly Coupon[]>(COUPONS_MOCK);
  /** Quem usou cada cupom (código → e-mail → vezes). Fase 2: tabela `coupon_usage`. */
  private readonly usage = signal<Readonly<Record<string, Readonly<Record<string, number>>>>>({
    BEMVINDO30: { 'maria@email.com': 1 },
  });
  private readonly appliedCode = signal<string | null>(readJson<string>(COUPON_STORAGE_KEY));

  readonly all = this.state.asReadonly();
  /** Hoje (`aaaa-mm-dd`). Fase 2: o back decide. */
  readonly today = signal(isoDay(new Date()));

  /** Cupom aplicado (lido do cadastro: se a equipe mudar, a loja já vê a regra nova). */
  readonly applied = computed(() => this.find(this.appliedCode()) ?? null);

  /** Carrinho atual: subtotal e quanto dele está fora de oferta. */
  private readonly cartTotals = computed(() => ({
    subtotal: this.cart.subtotal(),
    promoFree: this.cart
      .items()
      .filter((line) => line.variant.promoPrice == null)
      .reduce((sum, line) => sum + line.variant.price * line.quantity, 0),
  }));

  constructor() {
    effect(() => writeJson(COUPON_STORAGE_KEY, this.appliedCode()));
  }

  find(code: string | null): Coupon | undefined {
    return code ? this.state().find((coupon) => coupon.code === code) : undefined;
  }

  apply(rawCode: string): CouponResult {
    const code = normalizeCode(rawCode);
    if (!code) return { ok: false, message: 'Digite o código do cupom.' };
    const coupon = this.find(code);
    if (!coupon) return { ok: false, message: 'Cupom inválido ou expirado.' };
    const problem = this.problemFor(coupon);
    if (problem) return { ok: false, message: problem };
    this.appliedCode.set(code);
    return { ok: true, coupon };
  }

  remove(): void {
    this.appliedCode.set(null);
  }

  /** Motivo de o cupom não valer para a compra atual (ou `null` se vale). */
  problem(coupon: Coupon | null): string | null {
    return coupon ? this.problemFor(coupon) : null;
  }

  /** Desconto nos produtos (R$) da compra atual; 0 se o cupom não vale. */
  productDiscount(coupon: Coupon | null): number {
    if (!coupon || this.problemFor(coupon)) return 0;
    return couponDiscount(coupon, this.eligible(coupon));
  }

  /** Pedido criado com o cupom: conta o uso (no back, na mesma transação do pedido). */
  recordUse(code: string, email: string, discount: number): void {
    this.state.update((list) =>
      list.map((c) =>
        c.code === code
          ? {
              ...c,
              uses: c.uses + 1,
              discountGiven: Math.round((c.discountGiven + discount) * 100) / 100,
            }
          : c,
      ),
    );
    this.usage.update((all) => ({
      ...all,
      [code]: { ...all[code], [email]: (all[code]?.[email] ?? 0) + 1 },
    }));
  }

  /**
   * Pedido cancelado ANTES do envio (pagamento não confirmado, cartão recusado,
   * loja cancelou): devolve o uso — total e do cliente — e o desconto dado.
   * Devolução depois da entrega não chama isto (o cupom foi usado de verdade).
   * Fase 2: na mesma transação do cancelamento; `coupon_usage` marcado como estornado.
   */
  releaseUse(code: string, email: string, discount: number): void {
    const round = (n: number) => Math.max(0, Math.round(n * 100) / 100);
    this.state.update((list) =>
      list.map((c) =>
        c.code === code
          ? {
              ...c,
              uses: Math.max(0, c.uses - 1),
              discountGiven: round(c.discountGiven - discount),
            }
          : c,
      ),
    );
    this.usage.update((all) => {
      const used = all[code]?.[email] ?? 0;
      return used ? { ...all, [code]: { ...all[code], [email]: used - 1 } } : all;
    });
  }

  // --- Cadastro (backoffice) ---------------------------------------------------

  save(id: number | null, draft: CouponDraft): number {
    const nextId = id ?? Math.max(0, ...this.state().map((c) => c.id)) + 1;
    this.state.update((list) =>
      id == null
        ? [...list, { ...draft, id: nextId, uses: 0, discountGiven: 0 }]
        : list.map((c) => (c.id === id ? { ...c, ...draft, id } : c)),
    );
    return nextId;
  }

  delete(id: number): void {
    this.state.update((list) => list.filter((c) => c.id !== id));
  }

  private eligible(coupon: Coupon): number {
    const totals = this.cartTotals();
    return coupon.allowOnPromo ? totals.subtotal : totals.promoFree;
  }

  /** Sem login, limite por cliente e 1ª compra ficam para o checkout (que exige login). */
  private problemFor(coupon: Coupon): string | null {
    // Cupom de afiliado só vale com o programa no ar e a participação ativa.
    if (coupon.affiliateEmail && !this.affiliates.participating(coupon.affiliateEmail)) {
      return 'Cupom inválido ou expirado.';
    }
    const user = this.auth.user();
    return couponProblem(coupon, {
      today: this.today(),
      subtotal: this.cartTotals().subtotal,
      eligibleSubtotal: this.eligible(coupon),
      customer: user
        ? {
            usedThisCoupon: this.usage()[coupon.code]?.[user.email] ?? 0,
            hasPurchased: this.orders.hasPlaced(user.email),
            isOwner: coupon.affiliateEmail === user.email,
          }
        : null,
    });
  }
}
