import { Directive, ElementRef, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';
import { formatCep } from '../../core/services/shipping-service';
import {
  formatCardNumber,
  formatCpf,
  formatDocument,
  formatExpiry,
  onlyDigits,
} from '../../core/utils/br-format';

export type MaskKind = 'cep' | 'cpf' | 'document' | 'card' | 'expiry' | 'cvv';

const MASKS: Record<MaskKind, (value: string) => string> = {
  cep: formatCep,
  cpf: formatCpf,
  document: formatDocument,
  card: formatCardNumber,
  expiry: formatExpiry,
  cvv: (value) => onlyDigits(value, 4),
};

/**
 * Máscara enquanto digita: `<input appMask="cpf" formControlName="cpf">`.
 * Formata o texto do campo e mantém o valor do formulário igual ao exibido.
 */
@Directive({
  selector: 'input[appMask]',
  host: { '(input)': 'onInput()' },
})
export class InputMask {
  readonly appMask = input.required<MaskKind>();

  private readonly field = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly control = inject(NgControl, { optional: true, self: true });

  protected onInput(): void {
    const masked = MASKS[this.appMask()](this.field.value);
    if (masked !== this.field.value) this.field.value = masked;
    this.control?.control?.setValue(masked);
  }
}
