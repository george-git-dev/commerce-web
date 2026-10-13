import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../core/services/order-service';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { OrderStatusChip } from '../../../shared/order-status/order-status';

/** `/minha-conta/pedidos` — lista de pedidos da conta. */
@Component({
  selector: 'app-orders',
  imports: [
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    EmptyState,
    OrderStatusChip,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Orders {
  protected readonly orders = inject(OrderService).orders;
}
