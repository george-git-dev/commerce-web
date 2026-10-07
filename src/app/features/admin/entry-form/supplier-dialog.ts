import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { formatCnpj, formatPhone } from '../../../core/utils/br-format';
import { AdminPurchaseStore } from '../services/admin-purchase-store';
import { supplierProblems } from '../services/purchase-rules';

/** Fornecedor novo sem sair da entrada: só o essencial (o resto se edita depois). */
@Component({
  selector: 'app-supplier-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Novo fornecedor</h2>
    <form (submit)="$event.preventDefault(); save()" novalidate>
      <mat-dialog-content class="qd">
        <label>
          Razão social
          <input
            [value]="legalName()"
            [attr.aria-invalid]="(tried() && legalName().trim().length < 3) || null"
            (input)="legalName.set($any($event.target).value)"
            cdkFocusInitial
          />
        </label>
        <label>
          Nome fantasia (opcional)
          <input [value]="tradeName()" (input)="tradeName.set($any($event.target).value)" />
        </label>
        <label>
          CNPJ
          <input
            inputmode="numeric"
            placeholder="00.000.000/0000-00"
            [value]="cnpj()"
            (input)="cnpj.set(format($any($event.target).value))"
          />
        </label>
        <label>
          WhatsApp (opcional)
          <input
            inputmode="tel"
            placeholder="(11) 99999-9999"
            [value]="whatsapp()"
            (input)="whatsapp.set(phone($any($event.target).value))"
          />
        </label>
        @if (tried() && problems().length) {
          <ul class="qd__problems" role="alert">
            @for (problem of problems(); track problem) {
              <li>{{ problem }}</li>
            }
          </ul>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Voltar</button>
        <button matButton="filled" type="submit">Cadastrar</button>
      </mat-dialog-actions>
    </form>
  `,
  styleUrl: './quick-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierDialog {
  private readonly store = inject(AdminPurchaseStore);
  private readonly ref = inject(MatDialogRef<SupplierDialog, number>);
  protected readonly format = formatCnpj;
  protected readonly phone = formatPhone;

  protected readonly legalName = signal('');
  protected readonly tradeName = signal('');
  protected readonly cnpj = signal('');
  protected readonly whatsapp = signal('');
  protected readonly tried = signal(false);

  private readonly draft = computed(() => ({
    legalName: this.legalName(),
    tradeName: this.tradeName(),
    cnpj: this.cnpj(),
    whatsapp: this.whatsapp(),
    contact: '',
    email: '',
    leadTimeDays: null,
    brands: [],
    active: true,
    notes: '',
  }));
  protected readonly problems = computed(() =>
    supplierProblems(this.draft(), this.store.cnpjsExcept(null)),
  );

  protected save(): void {
    this.tried.set(true);
    if (this.problems().length) return;
    this.ref.close(this.store.saveSupplier(null, this.draft()));
  }
}
