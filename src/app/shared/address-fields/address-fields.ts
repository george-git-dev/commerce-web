import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
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

  readonly group = input.required<AddressForm>();
  /** Prefixo dos ids, para não repetir quando há dois endereços na página. */
  readonly idPrefix = input.required<string>();
  /** CEP completo e válido (só dígitos) — a entrega usa para calcular o frete. */
  readonly cepComplete = output<string>();

  protected invalid(field: AddressField): boolean {
    const control = this.group().controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  protected onCepInput(): void {
    const cep = this.group().controls.cep.value;
    if (!isValidCep(cep)) return;
    const address = this.cepLookup.lookup(cep);
    if (address) this.group().patchValue(address);
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
