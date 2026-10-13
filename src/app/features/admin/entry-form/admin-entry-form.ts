import { CurrencyPipe, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { variantLabel } from '../../../core/utils/product-pricing';
import { NonNegative } from '../../../shared/input-mask/non-negative';
import { AdminProductStore } from '../services/admin-product-store';
import { AdminPurchaseStore } from '../services/admin-purchase-store';
import { entryProblems } from '../services/purchase-rules';
import { QuickProductDialog } from './quick-product-dialog';
import { SupplierDialog } from './supplier-dialog';

const NEW = '__novo__';

interface ItemRow {
  key: number;
  sku: string;
  quantity: string;
  unitCost: string;
}

/** `aaaa-mm-dd` no fuso local (o `toISOString` puxaria para UTC). */
function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * `/admin/estoque/entradas/nova` — compra de mercadoria: fornecedor, nota e
 * itens com custo. "Receber agora" soma no estoque; "Salvar como pedido"
 * deixa para receber quando chegar. Só frascos: decant entra por envase.
 */
@Component({
  selector: 'app-admin-entry-form',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, NonNegative, RouterLink],
  templateUrl: './admin-entry-form.html',
  styleUrl: './admin-entry-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntryForm {
  protected readonly store = inject(AdminPurchaseStore);
  private readonly products = inject(AdminProductStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  protected readonly canAddSupplier = inject(AuthService).can('suppliers:edit');
  protected readonly new = NEW;
  private readonly today = isoDate(new Date());
  protected readonly maxDate = this.today;

  protected readonly supplierId = signal<number | null>(null);
  protected readonly invoice = signal('');
  protected readonly date = signal(this.today);
  private nextKey = 1;
  protected readonly items = signal<readonly ItemRow[]>([this.emptyRow()]);
  protected readonly tried = signal(false);

  protected readonly suppliers = computed(() =>
    this.store.suppliers().filter((item) => item.active || item.id === this.supplierId()),
  );
  /** Frascos de todos os produtos (inclusive rascunhos do cadastro rápido). */
  protected readonly options = computed(() =>
    this.products
      .products()
      .flatMap((product) =>
        product.variants
          .filter((variant) => variant.kind === 'frasco')
          .map((variant) => ({
            sku: variant.id,
            label: `${product.brandName} · ${product.name} · ${variantLabel(product, variant)}`,
          })),
      )
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  );
  private readonly draft = computed(() => ({
    supplierId: this.supplierId(),
    invoice: this.invoice(),
    date: this.date(),
    items: this.items(),
  }));
  protected readonly problems = computed(() => entryProblems(this.draft(), this.today));
  protected readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + this.subtotal(item), 0),
  );

  protected subtotal(item: ItemRow): number {
    const value = Number(item.quantity) * Number(item.unitCost);
    return Number.isFinite(value) ? value : 0;
  }

  protected invalid(item: ItemRow, field: 'sku' | 'quantity' | 'unitCost'): boolean {
    if (!this.tried()) return false;
    if (field === 'sku') return !item.sku;
    const n = Number(item[field]);
    return field === 'quantity' ? !Number.isInteger(n) || n <= 0 : !(n > 0);
  }

  protected chooseSupplier(value: string): void {
    if (value !== NEW) {
      this.supplierId.set(Number(value));
      return;
    }
    const current = this.supplierId();
    this.supplierId.set(null);
    this.dialog
      .open<SupplierDialog, void, number>(SupplierDialog, {
        width: '460px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .subscribe((id) => this.supplierId.set(id ?? current));
  }

  protected chooseProduct(key: number, value: string): void {
    if (value !== NEW) {
      this.update(key, { sku: value });
      return;
    }
    const current = this.items().find((item) => item.key === key)?.sku ?? '';
    this.update(key, { sku: '' });
    this.dialog
      .open<QuickProductDialog, void, string>(QuickProductDialog, {
        width: '480px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .subscribe((sku) => this.update(key, { sku: sku ?? current }));
  }

  protected update(key: number, change: Partial<ItemRow>): void {
    this.items.update((list) =>
      list.map((item) => (item.key === key ? { ...item, ...change } : item)),
    );
  }

  protected addItem(): void {
    this.items.update((list) => [...list, this.emptyRow()]);
  }

  protected removeItem(key: number): void {
    this.items.update((list) => list.filter((item) => item.key !== key));
  }

  protected save(receiveNow: boolean): void {
    this.tried.set(true);
    if (this.problems().length) {
      this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const [y, m, d] = this.date().split('-').map(Number);
    const id = this.store.createEntry(
      {
        supplierId: this.supplierId()!,
        invoice: this.invoice(),
        date: new Date(y, m - 1, d),
        items: this.items().map((item) => ({
          sku: item.sku,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
        })),
      },
      receiveNow,
    );
    this.snackBar.open(
      receiveNow ? 'Entrada recebida — estoque atualizado.' : 'Pedido ao fornecedor registrado.',
      'Fechar',
      { duration: 3000 },
    );
    this.router.navigate(['/admin/estoque/entradas', id]);
  }

  private emptyRow(): ItemRow {
    return { key: this.nextKey++, sku: '', quantity: '', unitCost: '' };
  }
}
