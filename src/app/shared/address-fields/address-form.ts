import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { Address } from '../../core/models/order';
import { cepValidator } from '../../core/utils/br-validators';

/** Campos de endereço (entrega, cobrança e Minha conta usam o mesmo formato). */
export type AddressForm = FormGroup<{
  cep: FormControl<string>;
  street: FormControl<string>;
  number: FormControl<string>;
  noNumber: FormControl<boolean>;
  complement: FormControl<string>;
  district: FormControl<string>;
  city: FormControl<string>;
  state: FormControl<string>;
}>;

export type AddressFormValue = ReturnType<AddressForm['getRawValue']>;

export const NO_NUMBER = 'S/N';

export function addressGroup(fb: NonNullableFormBuilder, cep = ''): AddressForm {
  return fb.group({
    cep: [cep, [Validators.required, cepValidator]],
    street: ['', Validators.required],
    number: ['', Validators.required],
    noNumber: [false],
    complement: [''],
    district: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
  });
}

/** Valor do formulário → `Address`: sai o controle de tela e a UF vai em maiúsculas. */
export function addressFromForm(value: AddressFormValue): Address {
  return {
    cep: value.cep,
    street: value.street.trim(),
    number: value.number.trim(),
    complement: value.complement.trim(),
    district: value.district.trim(),
    city: value.city.trim(),
    state: value.state.toUpperCase(),
  };
}

/** Preenche o formulário com um endereço salvo (ou limpa, sem endereço). */
export function fillAddressForm(group: AddressForm, address?: Address): void {
  const noNumber = address?.number === NO_NUMBER;
  group.reset({ ...address, noNumber });
  if (noNumber) group.controls.number.disable();
  else group.controls.number.enable();
}
