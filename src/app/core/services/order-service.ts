import { Injectable, signal } from '@angular/core';
import { Order } from '../models/order';

/**
 * Pedidos. Hoje ficam em memória (somem ao recarregar); na Fase 2 viram
 * `POST /orders` (criação, com tudo recalculado no back) e `GET /me/orders`.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly state = signal<readonly Order[]>([]);

  readonly orders = this.state.asReadonly();

  place(draft: Omit<Order, 'number' | 'createdAt' | 'status'>): Order {
    const order: Order = {
      ...draft,
      number: `NP${String(Date.now()).slice(-6)}`,
      createdAt: new Date().toISOString(),
      // Cartão aprovado na hora no mock; Pix e boleto aguardam o pagamento.
      status: draft.payment.method === 'cartao' ? 'pago' : 'aguardando-pagamento',
    };
    this.state.update((orders) => [order, ...orders]);
    return order;
  }

  find(number: string | null): Order | undefined {
    return this.state().find((order) => order.number === number);
  }
}
