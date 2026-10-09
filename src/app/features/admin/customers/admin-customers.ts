import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AdminCustomerStore } from '../services/admin-customer-store';
import {
  CUSTOMER_FILTER_LABELS,
  CUSTOMER_SORT_LABELS,
  CustomerFilter,
  CustomerSort,
  matchesCustomer,
  sortCustomers,
} from '../services/customer-rules';

const PAGE_SIZE = 20;
const RECENT_DAYS = 90;

/**
 * `/admin/clientes` — busca, filtros e ordem ficam só na tela (nada de dado
 * pessoal no endereço da página). Fase 2: busca e paginação no back.
 */
@Component({
  selector: 'app-admin-customers',
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './admin-customers.html',
  styleUrl: './admin-customers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCustomers {
  protected readonly store = inject(AdminCustomerStore);
  protected readonly filters = Object.entries(CUSTOMER_FILTER_LABELS) as [CustomerFilter, string][];
  protected readonly sorts = Object.entries(CUSTOMER_SORT_LABELS) as [CustomerSort, string][];

  protected readonly search = signal('');
  protected readonly filter = signal<CustomerFilter>('todos');
  protected readonly sort = signal<CustomerSort>('ultima-compra');
  protected readonly limit = signal(PAGE_SIZE);

  protected readonly filtered = computed(() => {
    const term = this.search();
    const filter = this.filter();
    const since = Date.now() - RECENT_DAYS * 86_400_000;
    const directory = this.store.directory;
    const list = this.store.customers().filter((customer) => {
      if (!matchesCustomer(customer, term)) return false;
      switch (filter) {
        case 'recentes':
          return (customer.lastOrderAt?.getTime() ?? 0) >= since;
        case 'sem-compra':
          return customer.orderCount === 0;
        case 'bloqueados':
          return !!directory.blockOf(customer.email);
        case 'em-maos':
          return directory.canReceiveInHands(customer.email);
        default:
          return true;
      }
    });
    return sortCustomers(list, this.sort());
  });

  protected readonly visible = computed(() => this.filtered().slice(0, this.limit()));

  /** Mudou busca/filtro/ordem: volta para a 1ª página. */
  protected set<T>(target: { set(value: T): void }, value: T): void {
    target.set(value);
    this.limit.set(PAGE_SIZE);
  }

  protected more(): void {
    this.limit.update((value) => value + PAGE_SIZE);
  }
}
