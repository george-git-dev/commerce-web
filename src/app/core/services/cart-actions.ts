import { inject, Injectable } from '@angular/core';
import { Product, ProductVariant } from '../models/product';
import { variantLabel } from '../utils/product-pricing';
import { Busy } from '../../shared/busy/busy';
import { CartStore } from './cart-store';
import { Notifier } from './notifier';
import { ShopApi } from './shop-api';

/**
 * "Adicionar ao carrinho" de qualquer tela: chama o back e só coloca na sacola
 * quando ele confirma. Erro: aviso global (interceptor) ou, se o back recusou
 * (ex.: esgotou), a mensagem dele.
 */
@Injectable({ providedIn: 'root' })
export class CartActions {
  private readonly api = inject(ShopApi);
  private readonly cart = inject(CartStore);
  private readonly notifier = inject(Notifier);

  add(product: Product, variant: ProductVariant, busy = new Busy(), then?: () => void): void {
    busy.run(
      this.api.addCartItem(variant.id),
      () => {
        this.cart.add(product, variant);
        if (then) then();
        else
          this.notifier.success(
            `${product.name} (${variantLabel(product, variant)}) foi adicionado ao carrinho.`,
          );
      },
      (error) => {
        if (error.kind === 'validation') this.notifier.error(error.message, error.requestId);
      },
    );
  }
}
