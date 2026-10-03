import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CartStore } from '../../core/services/cart-store';
import { CouponService } from '../../core/services/coupon-service';
import { OrderSummary } from '../../core/services/order-summary';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { CartLineItem } from './cart-line-item/cart-line-item';
import { ShippingCalculator } from './shipping-calculator/shipping-calculator';

/**
 * `/carrinho`. Itens no `CartStore`; frete, cupom e total no `OrderSummary`.
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
    RouterLink,
    ShippingCalculator,
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cart {
  protected readonly cart = inject(CartStore);
  private readonly coupons = inject(CouponService);
  private readonly summary = inject(OrderSummary);

  // Cupom: hoje valida contra cupons fictícios (`CouponService`); na Fase 2, o back.
  protected readonly coupon = signal('');
  protected readonly couponError = signal('');
  protected readonly appliedCoupon = this.summary.coupon;
  protected readonly couponProblem = this.summary.couponProblem;

  // Valores vêm do `OrderSummary` — os mesmos que o checkout mostra.
  protected readonly shippingOptions = this.summary.shippingOptions;
  protected readonly shippingId = this.summary.shippingId;
  protected readonly selectedShipping = this.summary.selectedShipping;
  protected readonly discount = this.summary.discount;
  protected readonly freeShippingByCoupon = this.summary.freeShippingByCoupon;
  protected readonly shippingPrice = this.summary.shippingPrice;
  protected readonly missingForFreeShipping = this.summary.missingForFreeShipping;
  /** No carrinho ainda não há forma de pagamento: total sem desconto de Pix. */
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
