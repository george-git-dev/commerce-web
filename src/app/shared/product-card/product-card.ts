import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { IMAGERY } from '../../core/config/imagery';
import { CATEGORY_LABELS } from '../../core/config/product-categories';
import { Product, ProductSelection } from '../../core/models/product';
import {
  defaultVariant,
  discountPercent,
  effectivePrice,
  hasDeal,
  hasPriceRange,
  isAvailable,
  primaryKind,
} from '../../core/utils/product-pricing';
import { StarRating } from '../star-rating/star-rating';

/**
 * Componente de apresentação: não conhece carrinho, favoritos nem snackbar —
 * só emite a intenção para quem o hospeda decidir o efeito.
 *
 * O card mostra o frasco mais barato disponível ("a partir de" quando há
 * preços diferentes) e é esse tamanho que o botão "Adicionar" envia.
 */
@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, RouterLink, StarRating],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  readonly product = input.required<Product>();
  readonly favorite = input(false);

  readonly addToCart = output<ProductSelection>();
  readonly toggleFavorite = output<Product>();

  /** Reserva para produto sem foto. */
  protected readonly placeholderImage = IMAGERY.productPlaceholder;

  /** Tipo exibido no card: frasco, se houver (ver `primaryKind`). */
  private readonly kind = computed(() => primaryKind(this.product()));
  protected readonly variant = computed(() => defaultVariant(this.product(), this.kind()));
  protected readonly price = computed(() => {
    const variant = this.variant();
    return variant ? effectivePrice(variant) : 0;
  });
  protected readonly fromPrice = computed(() => hasPriceRange(this.product(), this.kind()));
  protected readonly available = computed(() => isAvailable(this.product()));
  protected readonly deal = computed(() => hasDeal(this.product()));
  /** Etiqueta do card: a categoria (fora perfume) ou a família principal do perfume. */
  protected readonly tag = computed(() => {
    const item = this.product();
    return item.category === 'perfume' ? item.families[0] : CATEGORY_LABELS[item.category].label;
  });
  protected readonly discount = computed(() => {
    const variant = this.variant();
    return variant ? discountPercent(variant) : null;
  });

  protected add(): void {
    const variant = this.variant();
    if (variant) this.addToCart.emit({ product: this.product(), variant });
  }
}
