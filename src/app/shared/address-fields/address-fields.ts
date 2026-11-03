import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { catchError, EMPTY, finalize, Subject, switchMap, tap } from 'rxjs';
import { CepLookup } from '../../core/services/cep-lookup';
import { isValidCep, onlyCepDigits } from '../../core/services/shipping-service';
import { InputMask } from '../input-mask/input-mask';
import { AddressForm, NO_NUMBER } from './address-form';

type AddressField = keyof AddressForm['controls'];

/**
 * Campos de endereço com busca pelo CEP e "Sem número".
 * Usado na entrega, no endereço da nota fiscal e em Minha conta → Endereços.
 */
@Component({
  selector: 'app-address-fields',
  imports: [ReactiveFormsModule, InputMask],
  templateUrl: './address-fields.html',
  styleUrl: './address-fields.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressFields {
  private readonly cepLookup = inject(CepLookup);
  /** CEPs completos digitados; só a busca do último vale (`switchMap` cancela a anterior). */
  private readonly cepTyped = new Subject<string>();

  readonly group = input.required<AddressForm>();
  /** Prefixo dos ids, para não repetir quando há dois endereços na página. */
  readonly idPrefix = input.required<string>();
  /** CEP completo e válido (só dígitos) — a entrega usa para calcular o frete. */
  readonly cepComplete = output<string>();

  /** Busca em andamento (mostra "Buscando endereço…"). */
  protected readonly searching = signal(false);
  /** Aviso do back quando não deu para preencher (CEP não encontrado, serviço fora do ar). */
  protected readonly cepNotice = signal<string | null>(null);

  constructor() {
    this.cepTyped
      .pipe(
        tap(() => {
          this.searching.set(true);
          this.cepNotice.set(null);
        }),
        switchMap((cep) =>
          this.cepLookup.lookup(cep).pipe(
            tap((address) => this.group().patchValue(address)),
            catchError((error: Error) => {
              this.cepNotice.set(error.message);
              return EMPTY;
            }),
            finalize(() => this.searching.set(false)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  protected invalid(field: AddressField): boolean {
    const control = this.group().controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  protected onCepInput(): void {
    const cep = this.group().controls.cep.value;
    if (!isValidCep(cep)) {
      this.cepNotice.set(null);
      return;
    }
    this.cepTyped.next(cep);
    this.cepComplete.emit(onlyCepDigits(cep));
  }

  /** "Sem número": grava "S/N" e trava o campo (desabilitado não é validado). */
  protected toggleNoNumber(checked: boolean): void {
    const number = this.group().controls.number;
    if (checked) {
      number.setValue(NO_NUMBER);
      number.disable();
    } else {
      number.setValue('');
      number.enable();
    }
  }
}
