import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrderStatus, PAYMENT_METHOD_LABELS } from '../../../core/models/order';
import { ShippingOption } from '../../../core/models/shipping';
import { OrderStatusChip } from '../../../shared/order-status/order-status';
import { AdminOrder } from '../data/admin-orders-mock';
import { STATUS_ORDER } from '../services/admin-metrics';
import { statusLabel } from '../services/admin-order-flow';
import { AdminOrderStore } from '../services/admin-order-store';
import { ListMemory } from '../services/list-memory';
import { Pager } from '../shared/pager/pager';
import { Paging } from '../shared/pager/paging';

type StatusFilter = OrderStatus | 'todos';
type PeriodFilter = '7' | '30' | '90' | 'todos';
type ShippingFilter = ShippingOption['id'] | 'todos';

function createState() {
  const status = signal<StatusFilter>('todos');
  const search = signal('');
  const period = signal<PeriodFilter>('30');
  const shipping = signal<ShippingFilter>('todos');
  const paging = new Paging(() => `${status()}|${search()}|${period()}|${shipping()}`);
  return { status, search, period, shipping, paging };
}

/**
 * `/admin/pedidos` — lista com abas de status, busca, filtros e paginação.
 * Estado em memória (voltar do pedido cai na mesma página). Fase 2:
 * `GET /admin/orders?status=&q=&days=&shipping=&page=&size=`.
 */
@Component({
  selector: 'app-admin-orders',
  imports: [CurrencyPipe, DatePipe, MatIconModule, RouterLink, OrderStatusChip, Pager],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrders {
  private readonly store = inject(AdminOrderStore);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly methodLabels = PAYMENT_METHOD_LABELS;
  protected readonly statusLabel = statusLabel;
  protected readonly shippingLabels: Record<ShippingOption['id'], string> = {
    economico: 'Econômico',
    expresso: 'Expresso',
    'em-maos': 'Entrega em mãos',
  };

  private readonly state = inject(ListMemory).get('pedidos', createState);
  protected readonly status = this.state.status;
  protected readonly search = this.state.search;
  protected readonly period = this.state.period;
  protected readonly shipping = this.state.shipping;
  protected readonly paging = this.state.paging;

  constructor() {
    // Link do painel (`?status=pago`) escolhe a aba e volta para a 1ª página.
    const fromLink = this.query.get('status');
    if (fromLink && (STATUS_ORDER as readonly string[]).includes(fromLink)) {
      this.status.set(fromLink as OrderStatus);
    }
    // Tira o parâmetro: voltar de um pedido não pode desfazer a aba escolhida depois.
    if (fromLink) {
      void inject(Router).navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  /** Pedidos que passam por busca, período e entrega (antes da aba de status). */
  private readonly base = computed(() => {
    const term = this.search().trim().toLowerCase();
    const days = this.period();
    const since = days === 'todos' ? 0 : this.store.now.getTime() - Number(days) * 86_400_000;
    return this.store
      .orders()
      .filter(
        (order) =>
          order.createdAt.getTime() >= since &&
          (this.shipping() === 'todos' || order.shipping === this.shipping()) &&
          (!term ||
            order.number.toLowerCase().includes(term) ||
            order.customer.name.toLowerCase().includes(term) ||
            order.customer.email.toLowerCase().includes(term)),
      );
  });

  protected readonly tabs = computed(() => {
    const orders = this.base();
    return [
      { id: 'todos' as StatusFilter, label: 'Todos', count: orders.length },
      ...STATUS_ORDER.map((status) => ({
        id: status as StatusFilter,
        label: statusLabel(status, 'economico'),
        count: orders.filter((order) => order.status === status).length,
      })),
    ];
  });

  protected readonly filtered = computed(() =>
    this.status() === 'todos'
      ? this.base()
      : this.base().filter((order) => order.status === this.status()),
  );
  protected readonly page = computed(() => this.paging.of(this.filtered()));

  protected itemCount(order: AdminOrder): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}
