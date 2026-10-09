import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
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

/** Colunas da tabela (desktop), na ordem em que aparecem. */
const COLUMNS: readonly { id: CustomerSortColumn; label: string; numeric?: boolean }[] = [
  { id: 'nome', label: 'Cliente' },
  { id: 'pedidos', label: 'Pedidos', numeric: true },
  { id: 'total', label: 'Total gasto', numeric: true },
  { id: 'ultima-compra', label: 'Última compra' },
  { id: 'desde', label: 'Cliente desde' },
];

function createState() {
  const search = signal('');
  const filter = signal<CustomerFilter>('todos');
  const sort = signal<CustomerSort>({ column: 'ultima-compra', desc: true });
  const paging = new Paging(() => `${search()}|${filter()}|${sort().column}|${sort().desc}`);
  return { search, filter, sort, paging };
}

/**
 * `/admin/clientes` — cards no celular, tabela com ordenação por coluna no
 * desktop, paginado. Busca, filtro, ordem e página ficam em memória (voltar
 * da ficha cai no mesmo lugar; nada de dado pessoal na URL). Fase 2:
 * `GET /admin/customers?q=&filter=&page=&size=&sort=total,desc`.
 */
@Component({
  selector: 'app-admin-customers',
  imports: [CurrencyPipe, DatePipe, MatIconModule, NgTemplateOutlet, RouterLink, Pager],
  templateUrl: './admin-customers.html',
  styleUrl: './admin-customers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCustomers {
  protected readonly store = inject(AdminCustomerStore);
  private readonly router = inject(Router);
  private readonly state = inject(ListMemory).get('clientes', createState);

  protected readonly filters = Object.entries(CUSTOMER_FILTER_LABELS) as [CustomerFilter, string][];
  protected readonly sorts = Object.entries(CUSTOMER_SORT_LABELS) as [CustomerSortColumn, string][];
  protected readonly columns = COLUMNS;

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

  /** Cabeçalho: mesma coluna inverte; outra começa na direção natural. */
  protected sortBy(column: CustomerSortColumn): void {
    const current = this.sort();
    this.sort.set({
      column,
      desc: current.column === column ? !current.desc : defaultDesc(column),
    });
  }

  /** Select do celular: escolhe a coluna (direção natural). */
  protected sortColumn(column: CustomerSortColumn): void {
    this.sort.set({ column, desc: defaultDesc(column) });
  }

  protected flipSort(): void {
    this.sort.update((s) => ({ ...s, desc: !s.desc }));
  }

  protected ariaSort(column: CustomerSortColumn): 'ascending' | 'descending' | null {
    const { column: active, desc } = this.sort();
    return active === column ? (desc ? 'descending' : 'ascending') : null;
  }

  /** Clique em qualquer parte da linha abre a ficha (o link do nome é o caminho acessível). */
  protected open(event: MouseEvent, customer: AdminCustomer): void {
    if ((event.target as HTMLElement).closest('a')) return;
    void this.router.navigate(['/admin/clientes', customer.id]);
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
