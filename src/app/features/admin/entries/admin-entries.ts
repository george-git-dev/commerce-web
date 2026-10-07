import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { AdminPurchaseStore } from '../services/admin-purchase-store';
import { ENTRY_STATUS_LABELS, EntryStatus, entryTotal } from '../services/purchase-rules';
import { StockTabs } from '../stock/stock-tabs';

/** `/admin/estoque/entradas` — compras (entradas de mercadoria) por fornecedor. */
@Component({
  selector: 'app-admin-entries',
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, RouterLink, StockTabs],
  templateUrl: './admin-entries.html',
  styleUrl: './admin-entries.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntries {
  protected readonly store = inject(AdminPurchaseStore);
  protected readonly canEdit = inject(AuthService).can('stock:edit');
  protected readonly labels = ENTRY_STATUS_LABELS;
  protected readonly total = entryTotal;

  protected readonly search = signal('');
  protected readonly status = signal<EntryStatus | 'todas'>('todas');
  protected readonly supplier = signal('todos');

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.store
      .entries()
      .filter(
        (entry) =>
          (this.status() === 'todas' || entry.status === this.status()) &&
          (this.supplier() === 'todos' || String(entry.supplierId) === this.supplier()) &&
          (!term ||
            `${entry.invoice} ${this.store.supplierName(entry.supplierId)}`
              .toLowerCase()
              .includes(term)),
      );
  });
}
