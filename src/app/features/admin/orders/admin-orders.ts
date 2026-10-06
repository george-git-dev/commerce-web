import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderStatus, PAYMENT_METHOD_LABELS } from '../../../core/models/order';
import { ShippingOption } from '../../../core/models/shipping';
import { OrderStatusChip } from '../../../shared/order-status/order-status';
import { AdminOrder } from '../data/admin-orders-mock';
import { STATUS_ORDER } from '../services/admin-metrics';
import { statusLabel } from '../services/admin-order-flow';
import { AdminOrderStore } from '../services/admin-order-store';

type StatusFilter = OrderStatus | 'todos';
type PeriodFilter = '7' | '30' | '90' | 'todos';
type ShippingFilter = ShippingOption['id'] | 'todos';

const PAGE_SIZE = 20;

/** `/admin/pedidos` — lista com abas de status, busca e filtros. */
@Component({
  selector: 'app-admin-orders',
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, RouterLink, OrderStatusChip],
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

  /** Filtros (a aba de status pode vir do painel: `?status=pago`). */
  protected readonly status = signal<StatusFilter>(
    (STATUS_ORDER as readonly string[]).includes(this.query.get('status') ?? '')
      ? (this.query.get('status') as OrderStatus)
      : 'todos',
  );
  protected readonly search = signal('');
  protected readonly period = signal<PeriodFilter>('30');
  protected readonly shipping = signal<ShippingFilter>('todos');
  protected readonly limit = signal(PAGE_SIZE);

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
  protected readonly visible = computed(() => this.filtered().slice(0, this.limit()));

  protected setStatus(status: StatusFilter): void {
    this.status.set(status);
    this.limit.set(PAGE_SIZE);
  }

  protected onFilter(update: () => void): void {
    update();
    this.limit.set(PAGE_SIZE);
  }

  protected itemCount(order: AdminOrder): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  protected more(): void {
    this.limit.update((value) => value + PAGE_SIZE);
  }
}
