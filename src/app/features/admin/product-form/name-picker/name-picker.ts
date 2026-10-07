import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { normalizeName, similarName } from '../../services/product-rules';

const NEW = '__novo__';

/**
 * Escolher de uma lista ou criar um nome novo, avisando quando já existe um
 * igual ou parecido — evita marcas/linhas duplicadas ("Latafa" × "Lattafa").
 */
@Component({
  selector: 'app-name-picker',
  imports: [MatButtonModule],
  template: `
    <label class="np__field">
      {{ label() }}
      <select
        [disabled]="disabled()"
        [attr.aria-invalid]="invalid() || null"
        (change)="choose($any($event.target).value)"
      >
        <option value="" [disabled]="!emptyLabel()" [selected]="!creating() && !value()">
          {{ emptyLabel() ?? placeholder() }}
        </option>
        @for (option of sorted(); track option) {
          <option [value]="option" [selected]="!creating() && option === value()">
            {{ option }}
          </option>
        }
        <option [value]="new" [selected]="creating()">+ {{ newLabel() }}</option>
      </select>
    </label>
    @if (creating()) {
      <div class="np__new">
        <input
          [value]="draft()"
          [attr.aria-label]="newLabel()"
          (input)="draft.set($any($event.target).value); suggestion.set(undefined)"
          (keydown.enter)="$event.preventDefault(); confirm()"
        />
        <button matButton="outlined" type="button" (click)="confirm()">Adicionar</button>
      </div>
      @if (suggestion(); as similar) {
        <p class="np__warn" role="alert">
          Já existe "{{ similar }}".
          <button type="button" (click)="use(similar)">Usar "{{ similar }}"</button>
          <button type="button" (click)="use(draft().trim())">
            Criar "{{ draft().trim() }}" mesmo assim
          </button>
        </p>
      }
    }
    @if (invalid()) {
      <small class="np__error">{{ error() }}</small>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 6px;
    }

    .np__field {
      display: grid;
      gap: 6px;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }

    select,
    input {
      width: 100%;
      height: 48px;
      padding-inline: 12px;
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

    .np__new {
      display: flex;
      gap: 8px;
    }

    .np__warn {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--radius-sm);
      background: color-mix(in oklch, var(--gold) 16%, transparent);
      font-size: 0.8125rem;

      button {
        margin: 4px 8px 0 0;
        padding: 4px 0;
        border: 0;
        background: none;
        color: var(--earth);
        font: inherit;
        font-weight: 600;
        text-decoration: underline;
        cursor: pointer;
      }
    }

    .np__error {
      color: var(--wine);
      font-size: 0.75rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NamePicker {
  readonly label = input.required<string>();
  readonly options = input.required<readonly string[]>();
  readonly value = model('');
  readonly placeholder = input('Escolha');
  readonly newLabel = input('Novo');
  readonly error = input('');
  readonly showError = input(false);
  readonly disabled = input(false);
  /** `false` mantém a ordem recebida (ex.: categorias, Perfume primeiro). */
  readonly sort = input(true);
  /** Com texto, a opção vazia vira escolha válida (ex.: "Nenhum"). */
  readonly emptyLabel = input<string>();

  protected readonly new = NEW;
  protected readonly creating = signal(false);
  protected readonly draft = signal('');
  protected readonly suggestion = signal<string | undefined>(undefined);

  /** Inclui o valor atual mesmo se ele for novo (ainda não está na lista). */
  protected readonly sorted = computed(() => {
    const all = new Set([...this.options(), ...(this.value() ? [this.value()] : [])]);
    return this.sort() ? [...all].sort((a, b) => a.localeCompare(b, 'pt-BR')) : [...all];
  });
  protected readonly invalid = computed(() => this.showError() && !this.value() && !!this.error());

  protected choose(option: string): void {
    if (option === NEW) {
      this.creating.set(true);
      this.draft.set('');
      return;
    }
    this.creating.set(false);
    this.value.set(option);
  }

  /** Igual a um existente: usa o existente. Parecido: pergunta. Senão, cria. */
  protected confirm(): void {
    const name = this.draft().trim().replace(/\s+/g, ' ');
    if (name.length < 2) return;
    const exact = this.options().find((option) => normalizeName(option) === normalizeName(name));
    if (exact) return this.use(exact);
    const similar = similarName(name, this.options());
    if (similar) {
      this.suggestion.set(similar);
      return;
    }
    this.use(name);
  }

  protected use(name: string): void {
    this.value.set(name);
    this.creating.set(false);
    this.suggestion.set(undefined);
  }
}
