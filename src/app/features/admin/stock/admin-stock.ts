import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { variantLabel } from '../../../core/utils/product-pricing';
import { AdminStockStore, StockRow } from '../services/admin-stock-store';
import { STOCK_STATUS_LABELS, StockStatus } from '../services/stock-rules';
import { StockTabs } from './stock-tabs';
import { ListMemory } from '../services/list-memory';
import { Pager } from '../shared/pager/pager';
import { Paging } from '../shared/pager/paging';

type StatusFilter = 'todas' | 'alerta' | StockStatus;

const ORDER: Record<StockStatus, number> = { zerado: 0, baixo: 1, ok: 2 };

function createState() {
  const search = signal('');
  const status = signal<StatusFilter>('todas');
  const kind = signal<'todos' | 'frasco' | 'decant'>('todos');
  const brand = signal('todas');
  const paging = new Paging(() => `${search()}|${status()}|${kind()}|${brand()}`);
  return { search, status, kind, brand, paging };
}

/**
 * `/admin/estoque` — saldo por frasco e por tamanho de decant, com situação
 * (OK / Baixo / Zerado). `?situacao=alerta` (link do painel) já filtra.
 */
@Component({
  selector: 'app-admin-stock',
  imports: [MatIconModule, RouterLink, StockTabs, Pager],
  templateUrl: './admin-stock.html',
  styleUrl: './admin-stock.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStock {
  private readonly store = inject(AdminStockStore);
  protected readonly labels = STOCK_STATUS_LABELS;
  protected readonly variantLabel = variantLabel;

  private readonly state = inject(ListMemory).get('estoque', createState);
  protected readonly search = this.state.search;
  protected readonly status = this.state.status;
  protected readonly kind = this.state.kind;
  protected readonly brand = this.state.brand;
  protected readonly paging = this.state.paging;

  constructor() {
    // Link do painel (`?situacao=alerta`): aplica e tira da URL.
    if (inject(ActivatedRoute).snapshot.queryParamMap.get('situacao') === 'alerta') {
      this.status.set('alerta');
      void inject(Router).navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  protected readonly brands = computed(() =>
    [...new Set(this.store.rows().map((row) => row.product.brandName))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    ),
  );
  protected readonly counts = computed(() => {
    const rows = this.store.rows();
    return {
      total: rows.length,
      baixo: rows.filter((row) => row.status === 'baixo').length,
      zerado: rows.filter((row) => row.status === 'zerado').length,
    };
  });

  /** Zerados primeiro, depois baixos; dentro, por nome. */
  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.status();
    return this.store
      .rows()
      .filter(
        (row) =>
          (status === 'todas' ||
            (status === 'alerta' ? row.status !== 'ok' : row.status === status)) &&
          (this.kind() === 'todos' || row.variant.kind === this.kind()) &&
          (this.brand() === 'todas' || row.product.brandName === this.brand()) &&
          (!term ||
            `${row.product.name} ${row.product.brandName} ${row.variant.id}`
              .toLowerCase()
              .includes(term)),
      )
      .sort(
        (a, b) => ORDER[a.status] - ORDER[b.status] || a.product.name.localeCompare(b.product.name),
      );
  });

  protected readonly page = computed(() => this.paging.of(this.filtered()));

  /** Chip de resumo: liga o filtro; clicar de novo volta para "todas". */
  protected toggleStatus(status: StatusFilter): void {
    this.status.set(this.status() === status ? 'todas' : status);
  }

  protected track(row: StockRow): string {
    return row.variant.id;
  }
}
