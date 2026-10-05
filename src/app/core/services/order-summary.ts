import { computed, inject, Injectable, linkedSignal, signal } from '@angular/core';
import { STORE_CONFIG } from '../config/store-config';
import { PaymentMethod } from '../models/order';
import { ShippingOption } from '../models/shipping';
import { CartStore } from './cart-store';
import { AuthService } from './auth-service';
import { CouponService } from './coupon-service';
import { ShippingService } from './shipping-service';

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Valores do pedido em um só lugar — carrinho e checkout leem daqui, então a
 * escolha de frete e o cupom seguem de uma tela para a outra.
 * É PRÉVIA: o back recalcula tudo ao criar o pedido (nunca confiar no front).
 */
@Injectable({ providedIn: 'root' })
export class OrderSummary {
  private readonly cart = inject(CartStore);
  private readonly shipping = inject(ShippingService);
  private readonly coupons = inject(CouponService);
  private readonly auth = inject(AuthService);

  readonly subtotal = this.cart.subtotal;
  readonly coupon = this.coupons.applied;

  /**
   * Opções para o CEP da sessão; recalcula se o subtotal mudar (frete grátis).
   * Entrega em mãos só entra para a conta liberada pelo admin.
   */
  readonly shippingOptions = computed(() =>
    this.shipping.quote(
      this.shipping.cep(),
      this.subtotal(),
      this.auth.user()?.inHandsDelivery ?? false,
    ),
  );
  /** Mantém a escolha quando as opções mudam; padrão: a primeira (mais barata). */
  readonly shippingId = linkedSignal<readonly ShippingOption[], ShippingOption['id'] | null>({
    source: this.shippingOptions,
    computation: (options, previous) =>
      options.find((option) => option.id === previous?.value)?.id ?? options[0]?.id ?? null,
  });
  readonly selectedShipping = computed(
    () => this.shippingOptions().find((option) => option.id === this.shippingId()) ?? null,
  );

  /** Cupom aplicado que deixou de valer (ex.: a quantidade baixou do mínimo). */
  readonly couponProblem = computed(() => {
    const coupon = this.coupon();
    return coupon ? this.coupons.problem(coupon, this.subtotal()) : null;
  });
  readonly discount = computed(() => this.coupons.productDiscount(this.coupon(), this.subtotal()));
  readonly freeShippingByCoupon = computed(() => this.coupon()?.kind === 'shipping');
  readonly shippingPrice = computed(() =>
    this.freeShippingByCoupon() ? 0 : (this.selectedShipping()?.price ?? 0),
  );
  /** Quanto falta para o frete grátis (0 = já tem). */
  readonly missingForFreeShipping = computed(() =>
    Math.max(0, STORE_CONFIG.freeShippingMin - this.subtotal()),
  );

  /** Forma de pagamento escolhida no checkout (afeta o desconto no Pix). */
  readonly paymentMethod = signal<PaymentMethod | null>(null);
  readonly pixDiscount = computed(() =>
    this.paymentMethod() === 'pix' && STORE_CONFIG.pixDiscountPercent > 0
      ? round2(((this.subtotal() - this.discount()) * STORE_CONFIG.pixDiscountPercent) / 100)
      : 0,
  );

  readonly total = computed(() =>
    round2(this.subtotal() - this.discount() - this.pixDiscount() + this.shippingPrice()),
  );
}
