import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAYMENT_METHOD_LABELS } from '../../../../core/models/order';
import { OrderStatusChip } from '../../../../shared/order-status/order-status';
import { AdminOrder } from '../../data/admin-orders-mock';

/** Últimos pedidos do painel: card no celular, linha de tabela no desktop. */
@Component({
  selector: 'app-latest-orders',
  imports: [CurrencyPipe, DatePipe, RouterLink, OrderStatusChip],
  templateUrl: './latest-orders.html',
  styleUrl: './latest-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LatestOrders {
  readonly orders = input.required<readonly AdminOrder[]>();
  protected readonly methodLabels = PAYMENT_METHOD_LABELS;
}
