import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ORDER_STATUS_LABELS, OrderStatus } from '../../core/models/order';

/** Selo colorido com o status do pedido. */
@Component({
  selector: 'app-order-status',
  template: `{{ label() }}`,
  host: { '[class]': "'status status--' + status()" },
  styles: `
    :host {
      display: inline-flex;
      padding: 3px 10px;
      border-radius: 999px;
      font-family: var(--font-ui);
      font-size: 0.6875rem;
      font-weight: 600;
      white-space: nowrap;
      background: var(--muted);
      color: var(--foreground);
    }

    :host(.status--aguardando-pagamento) {
      background: color-mix(in oklch, var(--gold) 22%, transparent);
    }

    :host(.status--enviado),
    :host(.status--em-separacao),
    :host(.status--pago) {
      background: color-mix(in oklch, var(--earth) 18%, transparent);
    }

    :host(.status--entregue) {
      background: var(--primary);
      color: var(--primary-foreground);
    }

    :host(.status--cancelado) {
      background: color-mix(in oklch, var(--wine) 15%, transparent);
      color: var(--wine);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderStatusChip {
  readonly status = input.required<OrderStatus>();
  protected readonly label = computed(() => ORDER_STATUS_LABELS[this.status()]);
}
