import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { isValidCep } from '../services/shipping-service';
import {
  isValidCardNumber,
  isValidCpf,
  isValidDocument,
  isValidExpiry,
  onlyDigits,
} from './br-format';

/** Cria um validador que só roda com campo preenchido (o "obrigatório" é à parte). */
function check(key: string, valid: (value: string) => boolean): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');
    return !value || valid(value) ? null : { [key]: true };
  };
}

export const cepValidator = check('cep', isValidCep);
export const cpfValidator = check('cpf', isValidCpf);
export const documentValidator = check('document', isValidDocument);
export const cardNumberValidator = check('cardNumber', isValidCardNumber);
export const expiryValidator = check('expiry', (value) => isValidExpiry(value));
export const cvvValidator = check('cvv', (value) => /^\d{3,4}$/.test(onlyDigits(value)));
