import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { LINK_PRESETS, parseInternalLink } from '../../../core/utils/storefront-rules';

/**
 * "Para onde leva": destinos prontos da loja ou "Outra página da loja…" com o
 * caminho digitado (só endereços internos, começando com "/").
 */
@Component({
  selector: 'app-link-picker',
  template: `
    <label>
      Para onde leva ao tocar
      <select [disabled]="disabled()" (change)="preset.set($any($event.target).value)">
        @for (option of presets; track option.id) {
          <option [value]="option.id" [selected]="option.id === preset()">
            {{ option.label }}
          </option>
        }
      </select>
    </label>
    @if (preset() === 'custom') {
      <label>
        Endereço na loja
        <input
          placeholder="/produtos?marca=Lattafa"
          autocapitalize="off"
          spellcheck="false"
          [disabled]="disabled()"
          [value]="text()"
          [attr.aria-invalid]="(tried() && !valid()) || null"
          (input)="text.set($any($event.target).value)"
        />
        <small class="lp__hint">
          Copie o endereço da página da loja a partir da barra "/" — ex.: /produtos/lattafa-asad
        </small>
      </label>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 14px;
      min-width: 0;
    }

    // Mesmo visual dos outros campos do formulário (o estilo do pai não entra aqui).
    label {
      display: grid;
      gap: 6px;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }

    select,
    input {
      width: 100%;
      min-width: 0;
      min-height: 48px;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--background);
      color: var(--foreground);
      font: inherit;
      font-size: 1rem;

      &[aria-invalid='true'] {
        border-color: var(--wine);
      }
    }

    .lp__hint {
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkPicker {
  readonly preset = model.required<string>();
  readonly text = model.required<string>();
  readonly tried = input(false);
  readonly disabled = input(false);

  protected readonly presets = LINK_PRESETS;

  protected valid(): boolean {
    return !!parseInternalLink(this.text());
  }
}
