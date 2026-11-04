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
import { Busy } from '../../../shared/busy/busy';
import {
  addressFromForm,
  addressGroup,
  fillAddressForm,
} from '../../../shared/address-fields/address-form';

/** Formulário aberto: `'novo'`, o id do endereço em edição ou `null` (só a lista). */
type Editing = 'novo' | string | null;

/**
 * `/minha-conta/enderecos` — lista, cadastro, edição, remoção e principal. No login de verdade,
 * tudo vem do back (`AddressBook` → BFF `/bff/me/addresses`): a tela só mostra o que ele devolve.
 */
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
  /** Lista carregada do back (até lá, "Carregando…"). */
  protected readonly loaded = signal(false);
  /** Não deu para carregar (o aviso global já saiu pelo interceptor); a tela oferece tentar de novo. */
  protected readonly loadFailed = signal(false);
  /** "Salvar endereço" ocupado até o back responder. */
  protected readonly saving = new Busy();

  protected readonly form = this.fb.group({
    address: addressGroup(this.fb),
    makeDefault: [false],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loadFailed.set(false);
    this.book.load().subscribe({
      next: () => this.loaded.set(true),
      error: () => this.loadFailed.set(true),
    });
  }

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
      this.saving.run(this.book.add(value, makeDefault), (saved) => {
        if (!saved) {
          this.snackBar.open(`Limite de ${MAX_ADDRESSES} endereços atingido.`, 'Fechar', {
            duration: 4000,
          });
          return;
        }
        this.saved();
      });
    } else if (editing) {
      this.saving.run(this.book.update(editing, value, makeDefault), () => this.saved());
    }
  }

  /** Erro do back: o aviso sai pelo interceptor e a lista continua como estava. */
  protected setDefault(address: SavedAddress): void {
    this.book.setDefault(address.id).subscribe({ error: () => undefined });
  }

  /** Sem diálogo de confirmação: remove na hora e oferece "Desfazer". */
  protected remove(address: SavedAddress): void {
    this.book.remove(address.id).subscribe({
      next: () =>
        this.snackBar
          .open('Endereço removido.', 'Desfazer', { duration: 5000 })
          .onAction()
          .subscribe(() => this.book.restore(address).subscribe({ error: () => undefined })),
      error: () => undefined,
    });
  }

  private saved(): void {
    this.snackBar.open('Endereço salvo.', 'Fechar', { duration: 3000 });
    this.open(null);
  }

  private open(editing: Editing): void {
    this.editing.set(editing);
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
