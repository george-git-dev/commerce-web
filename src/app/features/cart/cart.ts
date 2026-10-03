import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { STORE_CONFIG } from '../../core/config/store-config';
import { ShippingOption } from '../../core/models/shipping';
import { CartStore } from '../../core/services/cart-store';
import { CouponService } from '../../core/services/coupon-service';
import { ShippingService } from '../../core/services/shipping-service';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { CartLineItem } from './cart-line-item/cart-line-item';
import { ShippingCalculator } from './shipping-calculator/shipping-calculator';

/**
 * `/carrinho`. Estado sempre local (`CartStore`) — o botão de checkout aponta
 * para uma rota que ainda não existe: essa página é a Etapa 5 do roadmap.
 * Frete e total são prévias; o back recalcula tudo ao fechar o pedido.
 */
@Component({
  selector: 'app-cart',
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
    EmptyState,
    CartLineItem,
    ShippingCalculator,
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cart {
  protected readonly cart = inject(CartStore);
  private readonly shipping = inject(ShippingService);
  private readonly coupons = inject(CouponService);

  // Cupom: hoje valida contra cupons fictícios (`CouponService`); na Fase 2, o back.
  protected readonly coupon = signal('');
  protected readonly couponError = signal('');
  protected readonly appliedCoupon = this.coupons.applied;
  /** Cupom aplicado que deixou de valer (ex.: a quantidade baixou do mínimo). */
  protected readonly couponProblem = computed(() => {
    const coupon = this.appliedCoupon();
    return coupon ? this.coupons.problem(coupon, this.cart.subtotal()) : null;
  });
  protected readonly discount = computed(() =>
    this.coupons.productDiscount(this.appliedCoupon(), this.cart.subtotal()),
  );
  protected readonly freeShippingByCoupon = computed(
    () => this.appliedCoupon()?.kind === 'shipping',
  );

  /** Opções de entrega para o CEP da sessão; recalcula se o subtotal mudar (frete grátis). */
  protected readonly shippingOptions = computed(() =>
    this.shipping.quote(this.shipping.cep(), this.cart.subtotal()),
  );
  /** Mantém a escolha quando as opções são recalculadas; padrão: a primeira (mais barata). */
  protected readonly shippingId = linkedSignal<
    readonly ShippingOption[],
    ShippingOption['id'] | null
  >({
    source: this.shippingOptions,
    computation: (options, previous) =>
      options.find((option) => option.id === previous?.value)?.id ?? options[0]?.id ?? null,
  });
  protected readonly selectedShipping = computed(
    () => this.shippingOptions().find((option) => option.id === this.shippingId()) ?? null,
  );
  /** Quanto falta para o frete grátis (0 = já tem). */
  protected readonly missingForFreeShipping = computed(() =>
    Math.max(0, STORE_CONFIG.freeShippingMin - this.cart.subtotal()),
  );
  protected readonly shippingPrice = computed(() =>
    this.freeShippingByCoupon() ? 0 : (this.selectedShipping()?.price ?? 0),
  );
  /** Prévia: o valor final é sempre recalculado pelo back no checkout. */
  protected readonly total = computed(
    () => this.cart.subtotal() - this.discount() + this.shippingPrice(),
  );

  protected applyCoupon(): void {
    const result = this.coupons.apply(this.coupon(), this.cart.subtotal());
    if (result.ok) {
      this.coupon.set('');
      this.couponError.set('');
    } else {
      this.couponError.set(result.message);
    }
  }

  protected removeCoupon(): void {
    this.coupons.remove();
  }
}
