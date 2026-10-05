import { computed, inject, Injectable, signal } from '@angular/core';
import { sampleOrders } from '../data/orders-mock';
import { Order } from '../models/order';
import { AuthService } from './auth-service';
import { CatalogService } from './catalog-service';

/**
 * Pedidos da conta logada. Hoje: os criados no checkout (em memória — pedido
 * tem endereço e CPF, então não vai para o navegador) + pedidos de exemplo.
 * Fase 2: `POST /orders` (o back recalcula tudo) e `GET /me/orders`.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);
  /** Pedidos criados nesta sessão, por e-mail da conta. */
  private readonly created = signal<Readonly<Record<string, readonly Order[]>>>({});

  /** Da conta logada, mais recentes primeiro. */
  readonly orders = computed<readonly Order[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    const samples = sampleOrders(user.name, (slug) => this.catalog.findBySlug(slug));
    return [...(this.created()[user.email] ?? []), ...samples];
  });

  place(draft: Omit<Order, 'number' | 'createdAt' | 'status'>): Order {
    const order: Order = {
      ...draft,
      number: `NP${String(Date.now()).slice(-6)}`,
      createdAt: new Date().toISOString(),
      // Cartão aprovado na hora no mock; Pix e boleto aguardam o pagamento.
      status: draft.payment.method === 'cartao' ? 'pago' : 'aguardando-pagamento',
    };
    const email = this.auth.user()?.email;
    if (email) {
      this.created.update((all) => ({ ...all, [email]: [order, ...(all[email] ?? [])] }));
    }
    return order;
  }

  find(number: string | null): Order | undefined {
    return this.orders().find((order) => order.number === number);
  }
}
