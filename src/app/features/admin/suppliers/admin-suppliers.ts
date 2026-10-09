import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { formatCnpj, onlyDigits } from '../../../core/utils/br-format';
import { AdminPurchaseStore } from '../services/admin-purchase-store';
import { StockTabs } from '../stock/stock-tabs';
import { ListMemory } from '../services/list-memory';
import { Pager } from '../shared/pager/pager';
import { Paging } from '../shared/pager/paging';

/** `/admin/estoque/fornecedores` — quem vende para a loja e quanto já se comprou no ano. */
@Component({
  selector: 'app-admin-suppliers',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, RouterLink, StockTabs, Pager],
  template: `
    <section class="su" #top>
      <app-stock-tabs />
      <div class="su__bar">
        <label class="su__search">
          <mat-icon aria-hidden="true">search</mat-icon>
          <input
            type="search"
            placeholder="Nome, CNPJ ou marca"
            aria-label="Buscar fornecedor"
            [value]="search()"
            (input)="search.set($any($event.target).value)"
          />
        </label>
        @if (canEdit) {
          <a matButton="filled" class="ui-cta" routerLink="/admin/estoque/fornecedores/novo">
            <mat-icon>add</mat-icon> Novo fornecedor
          </a>
        }
      </div>
      @if (filtered().length) {
        <ul class="su__list">
          @for (s of page().content; track s.id) {
            <li>
              <a class="su__row" [routerLink]="['/admin/estoque/fornecedores', s.id]">
                <span class="su__main">
                  <strong>{{ s.tradeName || s.legalName }}</strong>
                  <small>{{ cnpj(s.cnpj) }} · {{ s.brands.join(', ') || 'sem marcas' }}</small>
                </span>
                <span class="su__year">
                  {{ store.yearTotal(s.id) | currency: 'BRL' }}
                  <small>comprado no ano</small>
                </span>
                <span class="su__status" [class.su__status--off]="!s.active">
                  {{ s.active ? 'Ativo' : 'Inativo' }}
                </span>
              </a>
            </li>
          }
        </ul>
        <app-pager [paging]="paging" [page]="page()" [anchor]="top" noun="fornecedores" />
      } @else {
        <p class="su__empty">Nenhum fornecedor encontrado.</p>
      }
    </section>
  `,
  styleUrl: './admin-suppliers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSuppliers {
  protected readonly store = inject(AdminPurchaseStore);
  protected readonly canEdit = inject(AuthService).can('suppliers:edit');
  protected readonly cnpj = formatCnpj;
  private readonly state = inject(ListMemory).get('fornecedores', () => {
    const search = signal('');
    return { search, paging: new Paging(() => search()) };
  });
  protected readonly search = this.state.search;
  protected readonly paging = this.state.paging;

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const digits = onlyDigits(term);
    return [...this.store.suppliers()]
      .sort((a, b) => Number(b.active) - Number(a.active) || a.tradeName.localeCompare(b.tradeName))
      .filter(
        (s) =>
          !term ||
          `${s.tradeName} ${s.legalName} ${s.brands.join(' ')}`.toLowerCase().includes(term) ||
          (digits.length >= 3 && s.cnpj.includes(digits)),
      );
  });

  protected readonly page = computed(() => this.paging.of(this.filtered()));
}
