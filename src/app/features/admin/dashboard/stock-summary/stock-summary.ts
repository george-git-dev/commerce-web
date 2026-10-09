import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AdminDashboard, IDLE_DAYS } from '../../services/admin-dashboard';

export type StockSummaryData = ReturnType<AdminDashboard['stockSummary']>;

/**
 * Situação do estoque hoje: o que está acabando, o que acabou e o que está
 * parado (dinheiro empatado). Cada linha abre a tela de estoque.
 */
@Component({
  selector: 'app-stock-summary',
  imports: [CurrencyPipe, MatIconModule, RouterLink],
  template: `
    <header>
      <h3>Estoque</h3>
      <p>Situação de hoje · todo o catálogo</p>
    </header>
    @let s = data();
    <ul>
      <li>
        <a routerLink="/admin/estoque">
          <mat-icon aria-hidden="true">inventory_2</mat-icon>
          <span>
            Em estoque
            <strong>{{ s.units }} unidades</strong>
            <small>
              {{ s.value | currency: 'BRL' }} a preço de custo
              @if (s.uncosted) {
                · {{ s.uncosted }} {{ s.uncosted === 1 ? 'item' : 'itens' }} sem custo
              }
            </small>
          </span>
          <mat-icon class="ss__go" aria-hidden="true">chevron_right</mat-icon>
        </a>
      </li>
      <li>
        <a routerLink="/admin/estoque" [queryParams]="{ situacao: 'alerta' }">
          <mat-icon class="ss__warn" aria-hidden="true">warning</mat-icon>
          <span>
            Estoque baixo
            <strong>{{ s.low }} {{ s.low === 1 ? 'item' : 'itens' }}</strong>
            <small>No mínimo ou abaixo dele</small>
          </span>
          <mat-icon class="ss__go" aria-hidden="true">chevron_right</mat-icon>
        </a>
      </li>
      <li>
        <a routerLink="/admin/estoque" [queryParams]="{ situacao: 'alerta' }">
          <mat-icon class="ss__out" aria-hidden="true">block</mat-icon>
          <span>
            Esgotados
            <strong>{{ s.out }} {{ s.out === 1 ? 'item' : 'itens' }}</strong>
            <small>Sem unidade para vender</small>
          </span>
          <mat-icon class="ss__go" aria-hidden="true">chevron_right</mat-icon>
        </a>
      </li>
      <li>
        <a routerLink="/admin/estoque">
          <mat-icon aria-hidden="true">schedule</mat-icon>
          <span>
            Produtos parados
            <strong>{{ s.idle }} {{ s.idle === 1 ? 'produto' : 'produtos' }}</strong>
            <small>À venda, com estoque e sem venda há {{ idleDays }}+ dias</small>
          </span>
          <mat-icon class="ss__go" aria-hidden="true">chevron_right</mat-icon>
        </a>
      </li>
    </ul>
  `,
  styles: `
    :host {
      display: grid;
      align-content: start;
      gap: 6px;
      min-width: 0;
    }

    h3 {
      margin: 0;
      font-family: var(--font-ui);
      font-size: 1rem;
      font-weight: 600;
    }

    p {
      margin: 2px 0 0;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }

    ul {
      display: grid;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li + li {
      border-top: 1px solid var(--border);
    }

    a {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 56px;
      padding: 10px 0;
      color: inherit;
      font-size: 0.8125rem;
      text-decoration: none;

      > span {
        display: grid;
        flex: 1;
        min-width: 0;
        color: var(--muted-foreground);
      }

      &:hover strong {
        text-decoration: underline;
      }
    }

    strong {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--foreground);
    }

    small {
      font-size: 0.75rem;
    }

    mat-icon {
      flex-shrink: 0;
      color: var(--gold);
    }

    .ss__warn {
      color: #b07a00;
    }

    .ss__out {
      color: var(--wine);
    }

    .ss__go {
      color: var(--muted-foreground);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockSummary {
  readonly data = input.required<StockSummaryData>();
  protected readonly idleDays = IDLE_DAYS;
}
