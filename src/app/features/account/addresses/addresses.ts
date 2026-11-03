import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { SavedAddress } from '../../../core/models/order';
import { AddressBook, MAX_ADDRESSES } from '../../../core/services/address-book';
import { AddressFields } from '../../../shared/address-fields/address-fields';
import {
  addressFromForm,
  addressGroup,
  fillAddressForm,
} from '../../../shared/address-fields/address-form';

/** Formulário aberto: `'novo'`, o id do endereço em edição ou `null` (só a lista). */
type Editing = 'novo' | string | null;

/** `/minha-conta/enderecos` — lista, cadastro, edição, remoção e principal. */
@Component({
  selector: 'app-addresses',
  imports: [MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink, AddressFields],
  templateUrl: './addresses.html',
  styleUrl: './addresses.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Addresses {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly document = inject(DOCUMENT);
  protected readonly book = inject(AddressBook);
  protected readonly max = MAX_ADDRESSES;

  protected readonly editing = signal<Editing>(null);

  protected readonly form = this.fb.group({
    address: addressGroup(this.fb),
    makeDefault: [false],
  });

  protected startNew(): void {
    this.form.reset({ makeDefault: false });
    fillAddressForm(this.form.controls.address);
    this.open('novo');
  }

  protected startEdit(address: SavedAddress): void {
    this.form.reset({ makeDefault: address.isDefault });
    fillAddressForm(this.form.controls.address, address);
    this.open(address.id);
  }

  protected cancel(): void {
    this.open(null);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { address, makeDefault } = this.form.getRawValue();
    const value = addressFromForm(address);
    const editing = this.editing();
    if (editing === 'novo') {
      if (!this.book.add(value, makeDefault)) {
        this.snackBar.open(`Limite de ${MAX_ADDRESSES} endereços atingido.`, 'Fechar', {
          duration: 4000,
        });
        return;
      }
    } else if (editing) {
      this.book.update(editing, value, makeDefault);
    }
    this.snackBar.open('Endereço salvo.', 'Fechar', { duration: 3000 });
    this.open(null);
  }

  protected setDefault(address: SavedAddress): void {
    this.book.setDefault(address.id);
  }

  /** Sem diálogo de confirmação: remove na hora e oferece "Desfazer". */
  protected remove(address: SavedAddress): void {
    this.book.remove(address.id);
    this.snackBar
      .open('Endereço removido.', 'Desfazer', { duration: 5000 })
      .onAction()
      .subscribe(() => this.book.restore(address));
  }

  private open(editing: Editing): void {
    this.editing.set(editing);
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
