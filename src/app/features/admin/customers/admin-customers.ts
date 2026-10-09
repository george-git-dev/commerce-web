import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AdminCustomerStore } from '../services/admin-customer-store';
import {
  AdminCustomer,
  CUSTOMER_FILTER_LABELS,
  CUSTOMER_SORT_LABELS,
  CustomerFilter,
  CustomerSort,
  CustomerSortColumn,
  defaultDesc,
  matchesCustomer,
  sortCustomers,
} from '../services/customer-rules';
import { ListMemory } from '../services/list-memory';
import { Pager } from '../shared/pager/pager';
import { Paging } from '../shared/pager/paging';

const RECENT_DAYS = 90;

function createState() {
  const search = signal('');
  const filter = signal<CustomerFilter>('todos');
  const sort = signal<CustomerSort>({ column: 'ultima-compra', desc: true });
  const paging = new Paging(() => `${search()}|${filter()}|${sort().column}|${sort().desc}`);
  return { search, filter, sort, paging };
}

/**
 * `/admin/clientes` — lista em cards (mesmo padrão de Produtos), ordenação
 * por select, paginada. Busca, filtro, ordem e página ficam em memória (voltar
 * da ficha cai no mesmo lugar; nada de dado pessoal na URL). Fase 2:
 * `GET /admin/customers?q=&filter=&page=&size=&sort=total,desc`.
 */
@Component({
  selector: 'app-admin-customers',
  imports: [CurrencyPipe, DatePipe, MatIconModule, RouterLink, Pager],
  templateUrl: './admin-customers.html',
  styleUrl: './admin-customers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCustomers {
  protected readonly store = inject(AdminCustomerStore);
  private readonly state = inject(ListMemory).get('clientes', createState);

  protected readonly filters = Object.entries(CUSTOMER_FILTER_LABELS) as [CustomerFilter, string][];
  protected readonly sorts = Object.entries(CUSTOMER_SORT_LABELS) as [CustomerSortColumn, string][];

  protected readonly search = this.state.search;
  protected readonly filter = this.state.filter;
  protected readonly sort = this.state.sort;
  protected readonly paging = this.state.paging;

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
        case 'equipe':
          return directory.staffRolesOf(customer.email).length > 0;
        default:
          return true;
      }
    });
    return sortCustomers(list, this.sort());
  });

  protected readonly page = computed(() => this.paging.of(this.filtered()));

  /** Cada opção já vem na direção natural (nome A–Z; o resto, maior/mais recente primeiro). */
  protected sortColumn(column: CustomerSortColumn): void {
    this.sort.set({ column, desc: defaultDesc(column) });
  }

  protected tags(c: AdminCustomer) {
    const d = this.store.directory;
    return {
      blocked: !!d.blockOf(c.email),
      inHands: d.canReceiveInHands(c.email),
      staff: d.staffRolesOf(c.email).length > 0,
    };
  }
}
