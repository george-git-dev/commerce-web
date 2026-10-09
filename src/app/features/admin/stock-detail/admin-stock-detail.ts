import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { variantLabel } from '../../../core/utils/product-pricing';
import { NonNegative } from '../../../shared/input-mask/non-negative';
import { AdminPurchaseStore } from '../services/admin-purchase-store';
import { AdminStockStore, StockMoveType } from '../services/admin-stock-store';
import { STOCK_STATUS_LABELS, validMinimum } from '../services/stock-rules';
import { StockAdjustDialog, StockAdjustData, StockAdjustResult } from './stock-adjust-dialog';
import { Pager } from '../shared/pager/pager';
import { Paging } from '../shared/pager/paging';

const MOVE_LABELS: Record<StockMoveType, string> = {
  inicial: 'Saldo inicial',
  entrada: 'Entrada',
  saida: 'Saída',
  venda: 'Venda',
};

/** Movimentações por página no histórico. */

/** `/admin/estoque/:sku` — saldo, mínimo, ajuste manual e histórico de um item. */
@Component({
  selector: 'app-admin-stock-detail',
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, NonNegative, Pager, RouterLink],
  templateUrl: './admin-stock-detail.html',
  styleUrl: './admin-stock-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStockDetail {
  private readonly store = inject(AdminStockStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly canEdit = inject(AuthService).can('stock:edit');
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });

  protected readonly labels = STOCK_STATUS_LABELS;
  protected readonly moveLabels = MOVE_LABELS;
  protected readonly row = computed(() => this.store.row(this.params().get('sku')));
  protected readonly title = computed(() => {
    const row = this.row();
    return row ? variantLabel(row.product, row.variant) : '';
  });
  protected readonly history = computed(() => {
    const row = this.row();
    return row ? this.store.history(row.variant.id) : [];
  });
  /** Histórico paginado; volta à 1ª página ao trocar de item. */
  protected readonly historyPaging = new Paging(() => this.row()?.variant.id ?? '');
  protected readonly historyPage = computed(() => this.historyPaging.of(this.history()));
  /** Compras recebidas deste item (comparativo de custo por fornecedor). */
  private readonly purchaseStore = inject(AdminPurchaseStore);
  protected readonly purchases = computed(() => {
    const row = this.row();
    return row ? this.purchaseStore.purchasesOf(row.variant.id) : [];
  });
  protected readonly bestCost = computed(() =>
    Math.min(...this.purchases().map((p) => p.item.unitCost)),
  );
  /** Rascunho do campo "mínimo"; volta ao salvo quando o item muda. */
  protected readonly minDraft = linkedSignal<string>(() => String(this.row()?.min ?? ''));
  protected readonly minValid = computed(() => validMinimum(this.minDraft()));

  protected saveMinimum(): void {
    const row = this.row();
    if (!row || !this.minValid()) return;
    this.store.setMinimum(row.variant.id, Number(this.minDraft()));
    this.snackBar.open('Estoque mínimo salvo.', 'Fechar', { duration: 3000 });
  }

  protected adjust(): void {
    const row = this.row();
    if (!row) return;
    this.dialog
      .open<StockAdjustDialog, StockAdjustData, StockAdjustResult>(StockAdjustDialog, {
        data: { label: `${row.product.name} · ${this.title()}`, current: row.variant.stock },
        width: '440px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.store.adjust(
          row.variant.id,
          result.direction,
          result.quantity,
          result.reason,
          result.note,
        );
        this.snackBar.open('Estoque ajustado.', 'Fechar', { duration: 3000 });
      });
  }
}
