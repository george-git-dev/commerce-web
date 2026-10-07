import { Directive, input } from '@angular/core';

const BLOCKED = ['-', '+', 'e', 'E'];

/**
 * Campo numérico sem negativo: bloqueia "-", "+" e notação "e" ao digitar e
 * colar. `appNonNegative="integer"` também bloqueia vírgula/ponto (estoque, ml).
 * Só evita erro de digitação — quem valida é a regra do formulário (e o back).
 * Uso: `<input type="number" min="0" appNonNegative="integer">`.
 */
@Directive({
  selector: 'input[appNonNegative]',
  host: { '(keydown)': 'onKeydown($event)', '(paste)': 'onPaste($event)' },
})
export class NonNegative {
  readonly appNonNegative = input<'integer' | 'decimal' | ''>('');

  private blocked(): string[] {
    return this.appNonNegative() === 'integer' ? [...BLOCKED, '.', ','] : BLOCKED;
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.blocked().includes(event.key)) event.preventDefault();
  }

  protected onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    if (this.blocked().some((char) => text.includes(char))) event.preventDefault();
  }
}
