import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { formatCnpj } from '../../../core/utils/br-format';
import { variantLabel } from '../../../core/utils/product-pricing';
import { AdminProductStore } from '../services/admin-product-store';
import { AdminPurchaseStore } from '../services/admin-purchase-store';
import { ENTRY_STATUS_LABELS, entryTotal } from '../services/purchase-rules';
import { ActionDialog, ActionDialogData } from '../shared/action-dialog/action-dialog';

/** `/admin/estoque/entradas/:id` — nota, itens com custo e "Marcar como recebido". */
@Component({
  selector: 'app-admin-entry-detail',
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './admin-entry-detail.html',
  styleUrl: './admin-entry-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntryDetail {
  private readonly store = inject(AdminPurchaseStore);
  private readonly products = inject(AdminProductStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly canEdit = inject(AuthService).can('stock:edit');
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });

  protected readonly labels = ENTRY_STATUS_LABELS;
  protected readonly cnpj = formatCnpj;
  protected readonly entry = computed(() => this.store.entry(Number(this.params().get('id'))));
  protected readonly supplier = computed(() => this.store.supplier(this.entry()?.supplierId));
  protected readonly total = computed(() => entryTotal(this.entry()?.items ?? []));
  protected readonly lines = computed(() =>
    (this.entry()?.items ?? []).map((item) => {
      const product = this.products
        .products()
        .find((p) => p.variants.some((variant) => variant.id === item.sku));
      const variant = product?.variants.find((v) => v.id === item.sku);
      return {
        item,
        name: product ? `${product.brandName} · ${product.name}` : item.sku,
        size: product && variant ? variantLabel(product, variant) : '',
        draft: product?.status === 'rascunho',
        slug: product?.slug,
      };
    }),
  );

  protected receive(): void {
    const entry = this.entry();
    if (!entry) return;
    const units = entry.items.reduce((sum, item) => sum + item.quantity, 0);
    this.dialog
      .open<ActionDialog, ActionDialogData, string | true>(ActionDialog, {
        data: {
          title: 'Marcar como recebido?',
          message: `Soma ${units} unidades no estoque e atualiza o custo médio. Não dá para desfazer (use um ajuste de saída se precisar).`,
          confirmLabel: 'Receber',
        },
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.store.receive(entry.id);
        this.snackBar.open('Entrada recebida — estoque atualizado.', 'Fechar', { duration: 3000 });
      });
  }
}
