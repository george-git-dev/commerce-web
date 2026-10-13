import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { AdminPurchaseStore } from '../services/admin-purchase-store';

/** Abas de "Estoque e compras": Saldo · Entradas · Fornecedores. */
@Component({
  selector: 'app-stock-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="tabs__head">
      <p class="tabs__eyebrow">Gestão da loja</p>
      <h2>Estoque e compras</h2>
    </header>
    <nav class="tabs" aria-label="Estoque e compras">
      <a
        routerLink="/admin/estoque"
        routerLinkActive="tabs--on"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
        >Saldo</a
      >
      <a
        routerLink="/admin/estoque/entradas"
        routerLinkActive="tabs--on"
        ariaCurrentWhenActive="page"
      >
        Entradas
        @if (purchases.pendingCount(); as pending) {
          <span class="tabs__count" [attr.aria-label]="pending + ' a receber'">{{ pending }}</span>
        }
      </a>
      @if (auth.can('suppliers:view')) {
        <a
          routerLink="/admin/estoque/fornecedores"
          routerLinkActive="tabs--on"
          ariaCurrentWhenActive="page"
          >Fornecedores</a
        >
      }
    </nav>
  `,
  styles: `
    :host {
      display: grid;
      gap: 12px;
    }

    h2 {
      margin: 0;
      font-size: clamp(1.75rem, 1.4rem + 1.6vw, 2.5rem);
    }

    .tabs__eyebrow {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--gold);
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      overflow-x: auto;
      scrollbar-width: none;

      a {
        display: inline-flex;
        flex: 1 0 auto;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 44px;
        padding: 0 14px;
        border-bottom: 3px solid transparent;
        color: var(--muted-foreground);
        font-size: 0.9375rem;
        white-space: nowrap;
      }

      .tabs--on {
        border-color: var(--primary);
        color: var(--foreground);
        font-weight: 600;
      }
    }

    .tabs__count {
      display: grid;
      place-items: center;
      min-width: 20px;
      height: 20px;
      padding: 0 5px;
      border-radius: 999px;
      background: var(--gold);
      color: #fff;
      font-size: 0.6875rem;
      font-weight: 600;
    }

    @media (min-width: 700px) {
      .tabs a {
        flex: 0 0 auto;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockTabs {
  protected readonly purchases = inject(AdminPurchaseStore);
  protected readonly auth = inject(AuthService);
}
