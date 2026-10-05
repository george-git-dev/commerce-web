import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { LOCAL_DELIVERY } from '../../../core/config/store-config';
import { PAYMENT_METHOD_LABELS } from '../../../core/models/order';
import { CartStore } from '../../../core/services/cart-store';
import { CouponService } from '../../../core/services/coupon-service';
import { OrderService } from '../../../core/services/order-service';
import { OrderSummary } from '../../../core/services/order-summary';
import { cardBrand, onlyDigits } from '../../../core/utils/br-format';
import { effectivePrice, variantLabel } from '../../../core/utils/product-pricing';
import { addressFromForm } from '../../../shared/address-fields/address-form';
import { CheckoutState } from '../checkout-state';

/** Passo 3: revisão de tudo e confirmação do pedido. */
@Component({
  selector: 'app-review-step',
  imports: [CurrencyPipe, MatButtonModule, RouterLink],
  templateUrl: './review-step.html',
  styleUrl: './review-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewStep {
  protected readonly state = inject(CheckoutState);
  protected readonly summary = inject(OrderSummary);
  protected readonly cart = inject(CartStore);
  private readonly orders = inject(OrderService);
  private readonly coupons = inject(CouponService);
  private readonly router = inject(Router);

  private readonly delivery = this.state.delivery.getRawValue();
  protected readonly recipient = this.delivery.recipient;
  protected readonly address = this.delivery.address;
  protected readonly billing = this.state.billing.getRawValue();
  protected readonly inHands = this.state.inHands();
  protected readonly inHandsNote = LOCAL_DELIVERY.note;
  protected readonly payment = this.state.payment.getRawValue();
  protected readonly methodLabel = PAYMENT_METHOD_LABELS[this.payment.method];
  protected readonly cardLast4 = onlyDigits(this.payment.cardNumber).slice(-4);
  protected readonly variantLabel = variantLabel;
  protected readonly effectivePrice = effectivePrice;

  protected confirm(): void {
    const shipping = this.summary.selectedShipping();
    if (!shipping) {
      this.state.goTo(1);
      return;
    }
    const isCard = this.payment.method === 'cartao';
    // Mock: o pedido nasce no front. Na Fase 2 vai para `POST /orders` (itens,
    // endereço, frete escolhido, cupom e token do cartão) e o back recalcula tudo.
    const order = this.orders.place({
      items: this.cart.items().map((line, index) => ({
        id: `${line.variant.id}-${index}`,
        slug: line.product.slug,
        productName: line.product.name,
        variantLabel: variantLabel(line.product, line.variant),
        image: line.product.images[0] ?? '',
        quantity: line.quantity,
        unitPrice: effectivePrice(line.variant),
      })),
      // Entrega em mãos: sem endereço de entrega (combinado pelo WhatsApp).
      address: this.inHands
        ? null
        : { recipient: this.recipient, ...addressFromForm(this.address) },
      billing: {
        document: this.billing.document,
        name: this.billing.sameAsDelivery ? this.recipient : this.billing.name,
        address: addressFromForm(this.billing.sameAsDelivery ? this.address : this.billing.address),
      },
      shipping,
      payment: {
        method: this.payment.method,
        installments: isCard ? this.payment.installments : undefined,
        cardLast4: isCard ? this.cardLast4 : undefined,
        cardBrand: isCard ? (cardBrand(this.payment.cardNumber) ?? undefined) : undefined,
      },
      couponCode: this.summary.coupon()?.code,
      subtotal: this.summary.subtotal(),
      discount: this.summary.discount(),
      pixDiscount: this.summary.pixDiscount(),
      shippingPrice: this.summary.shippingPrice(),
      total: this.summary.total(),
    });
    this.cart.clear();
    this.coupons.remove();
    this.router.navigate(['/pedido', order.number], { replaceUrl: true });
  }
}
