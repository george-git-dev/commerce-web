import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { VARIANT_KIND_LABELS } from '../../../core/config/fragrance';
import { Product, ProductVariant, VariantKind } from '../../../core/models/product';
import {
  effectivePrice,
  hasPriceRange,
  lowestPrice,
  sealedLabel,
  variantKinds,
  variantsOfKind,
} from '../../../core/utils/product-pricing';

/** Abaixo disto, avisa "Últimas unidades". */
const LOW_STOCK = 3;

/**
 * Seletor de tipo (Frasco/Decant) e tamanho da página de produto.
 * Frasco é único (o original lacrado): só mostra o volume. Decant tem tamanhos.
 *
 * `kind` e `variant` são `model()`: a página passa os signals com `[(kind)]` e
 * `[(variant)]` (two-way binding) e o seletor escreve neles quando o cliente
 * escolhe. O estado continua na página, que usa o tamanho para preço e botões.
 */
@Component({
  selector: 'app-variant-picker',
  imports: [CurrencyPipe, MatButtonToggleModule, MatIconModule],
  templateUrl: './variant-picker.html',
  styleUrl: './variant-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantPicker {
  readonly product = input.required<Product>();
  readonly kind = model<VariantKind>();
  readonly variant = model<ProductVariant>();

  protected readonly kindLabels = VARIANT_KIND_LABELS;
  protected readonly lowStock = LOW_STOCK;
  protected readonly effectivePrice = effectivePrice;
  protected readonly lowestPrice = lowestPrice;
  protected readonly hasPriceRange = hasPriceRange;
  protected readonly sealedLabel = sealedLabel;

  /** Os botões Frasco/Decant só aparecem quando o produto tem os dois tipos. */
  protected readonly kinds = computed(() => variantKinds(this.product()));

  protected readonly sizes = computed(() => {
    const kind = this.kind();
    return kind ? variantsOfKind(this.product(), kind) : [];
  });
}
