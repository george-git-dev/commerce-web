import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CartStore } from '../../core/services/cart-store';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { CartLineItem } from './cart-line-item/cart-line-item';

/**
 * `/carrinho`. Estado sempre local (`CartStore`) — o botão de checkout aponta
 * para uma rota que ainda não existe: essa página é a Etapa 5 do roadmap.
 */
@Component({
  selector: 'app-cart',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, EmptyState, CartLineItem],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cart {
  protected readonly cart = inject(CartStore);

  // Cupom é só visual nesta fase — não há lógica de desconto real.
  protected readonly coupon = signal('');
}
