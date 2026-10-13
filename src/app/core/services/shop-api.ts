import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Chamadas da loja que já passam pela proteção global (interceptor). Hoje quem
 * responde é o mock (`mockApiInterceptor`); na Fase 2 é o Spring, com o mesmo
 * contrato. Só ids e quantidades vão no corpo — nada de preço (o back calcula).
 */
@Injectable({ providedIn: 'root' })
export class ShopApi {
  private readonly http = inject(HttpClient);

  /** `POST /api/cart/items` — o back confere estoque e devolve o carrinho. */
  addCartItem(variantId: string, quantity = 1): Observable<unknown> {
    return this.http.post('/api/cart/items', { variantId, quantity });
  }

  /** `POST /api/orders` — o back recalcula tudo e cria o pedido (sem nova tentativa). */
  placeOrder(items: readonly { variantId: string; quantity: number }[]): Observable<unknown> {
    return this.http.post('/api/orders', { items });
  }
}
