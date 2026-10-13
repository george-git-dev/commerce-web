import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ReturnService } from '../../../core/services/return-service';

/** Abas de Pedidos: pedidos · devoluções (com o número de solicitadas). */
@Component({
  selector: 'app-orders-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="tabs__head">
      <p class="tabs__eyebrow">Vendas</p>
      <h2>Pedidos</h2>
    </header>
    <nav class="tabs" aria-label="Pedidos">
      <a
        routerLink="/admin/pedidos"
        routerLinkActive="tabs--on"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
        >Pedidos</a
      >
      <a
        routerLink="/admin/pedidos/devolucoes"
        routerLinkActive="tabs--on"
        ariaCurrentWhenActive="page"
        >Devoluções
        @if (pending(); as count) {
          <span class="tabs__count" [attr.aria-label]="count + ' solicitadas'">{{ count }}</span>
        }
      </a>
    </nav>
  `,
  styleUrl: '../storefront/tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersTabs {
  protected readonly pending = inject(ReturnService).pendingCount;
}
