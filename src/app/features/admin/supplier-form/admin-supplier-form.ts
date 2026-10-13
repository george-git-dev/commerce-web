import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { formatCnpj, formatPhone } from '../../../core/utils/br-format';
import { NonNegative } from '../../../shared/input-mask/non-negative';
import { NamePicker } from '../product-form/name-picker/name-picker';
import { AdminBrandStore } from '../services/admin-brand-store';
import { AdminProductStore } from '../services/admin-product-store';
import { AdminPurchaseStore } from '../services/admin-purchase-store';
import { ENTRY_STATUS_LABELS, entryTotal, supplierProblems } from '../services/purchase-rules';

/** `/admin/estoque/fornecedores/novo` e `/:id` — cadastro e compras do fornecedor. */
@Component({
  selector: 'app-admin-supplier-form',
  imports: [
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    NamePicker,
    NonNegative,
    RouterLink,
  ],
  templateUrl: './admin-supplier-form.html',
  styleUrl: './admin-supplier-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSupplierForm {
  protected readonly store = inject(AdminPurchaseStore);
  private readonly products = inject(AdminProductStore);
  private readonly brandStore = inject(AdminBrandStore);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly readOnly = !inject(AuthService).can('suppliers:edit');
  protected readonly labels = ENTRY_STATUS_LABELS;
  protected readonly entryTotal = entryTotal;
  protected readonly cnpjMask = formatCnpj;
  protected readonly phoneMask = formatPhone;

  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  protected readonly original = this.store.supplier(this.id);

  protected readonly legalName = signal(this.original?.legalName ?? '');
  protected readonly tradeName = signal(this.original?.tradeName ?? '');
  protected readonly cnpj = signal(formatCnpj(this.original?.cnpj ?? ''));
  protected readonly contact = signal(this.original?.contact ?? '');
  protected readonly whatsapp = signal(formatPhone(this.original?.whatsapp ?? ''));
  protected readonly email = signal(this.original?.email ?? '');
  protected readonly leadTime = signal<string>(String(this.original?.leadTimeDays ?? ''));
  protected readonly brands = signal<readonly string[]>(this.original?.brands ?? []);
  protected readonly active = signal(this.original?.active ?? true);
  protected readonly notes = signal(this.original?.notes ?? '');
  protected readonly tried = signal(false);

  protected readonly brandOptions = computed(() =>
    [...new Set([...this.products.brandNames(), ...this.brands()])].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    ),
  );
  private readonly draft = computed(() => ({
    legalName: this.legalName(),
    tradeName: this.tradeName(),
    cnpj: this.cnpj(),
    contact: this.contact(),
    whatsapp: this.whatsapp(),
    email: this.email(),
    leadTimeDays: this.leadTime(),
    brands: this.brands(),
    active: this.active(),
    notes: this.notes(),
  }));
  protected readonly problems = computed(() =>
    supplierProblems(this.draft(), this.store.cnpjsExcept(this.id)),
  );
  protected readonly entries = computed(() => (this.id ? this.store.entriesOf(this.id) : []));
  protected readonly yearTotal = computed(() => (this.id ? this.store.yearTotal(this.id) : 0));

  /** Marcas ativas ainda não marcadas (para o "+ Nova marca" / adicionar). */
  protected readonly unselected = computed(() =>
    this.products.brandNames().filter((brand) => !this.brands().includes(brand)),
  );
  /** Recria o seletor depois de adicionar (volta para "Escolha"). */
  protected readonly pickKey = signal(0);

  /** Escolheu da lista ou criou: marca nova passa a valer em todo o backoffice. */
  protected addBrand(name: string): void {
    if (!name) return;
    this.brandStore.add(name);
    this.brands.update((list) => (list.includes(name) ? list : [...list, name]));
    this.pickKey.update((key) => key + 1);
  }

  protected toggleBrand(brand: string): void {
    this.brands.update((list) =>
      list.includes(brand) ? list.filter((item) => item !== brand) : [...list, brand],
    );
  }

  protected save(): void {
    this.tried.set(true);
    if (this.problems().length) return;
    const id = this.store.saveSupplier(this.id, this.draft());
    this.snackBar.open('Fornecedor salvo.', 'Fechar', { duration: 3000 });
    if (!this.id) this.router.navigate(['/admin/estoque/fornecedores', id]);
  }
}
