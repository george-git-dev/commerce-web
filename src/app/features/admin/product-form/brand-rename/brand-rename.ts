import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AdminBrandStore } from '../../services/admin-brand-store';

/**
 * "Renomear marca" embaixo do campo Marca: corrige o nome em todos os
 * produtos e fornecedores de uma vez (ex.: "Latafa" → "Lattafa").
 */
@Component({
  selector: 'app-brand-rename',
  template: `
    @if (editing()) {
      <div class="rn">
        <label>
          Novo nome da marca
          <input
            maxlength="40"
            [value]="draft()"
            [attr.aria-invalid]="(tried() && problems().length > 0) || null"
            (input)="draft.set($any($event.target).value)"
            (keydown.enter)="$event.preventDefault(); save()"
          />
        </label>
        <p class="rn__hint">
          Muda em {{ usage().products }} {{ usage().products === 1 ? 'produto' : 'produtos' }} e
          {{ usage().suppliers }} {{ usage().suppliers === 1 ? 'fornecedor' : 'fornecedores' }}.
        </p>
        @if (tried() && problems().length) {
          <p class="rn__error" role="alert">{{ problems()[0] }}</p>
        }
        <div class="rn__actions">
          <button type="button" (click)="editing.set(false)">Cancelar</button>
          <button type="button" class="rn__save" (click)="save()">Salvar nome</button>
        </div>
      </div>
    } @else {
      <button type="button" class="rn__link" (click)="start()">Renomear marca</button>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .rn {
      display: grid;
      gap: 8px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--background);
      font-size: 0.8125rem;

      label {
        display: grid;
        gap: 6px;
        color: var(--muted-foreground);
      }

      input {
        height: 44px;
        padding-inline: 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--card);
        font: inherit;
        font-size: 1rem;

        &[aria-invalid='true'] {
          border-color: var(--wine);
        }
      }
    }

    .rn__hint,
    .rn__error {
      margin: 0;
      color: var(--muted-foreground);
    }

    .rn__error {
      color: var(--wine);
    }

    .rn__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    button {
      min-height: 40px;
      padding: 0 14px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--card);
      font: inherit;
      cursor: pointer;
    }

    .rn__save {
      border-color: var(--primary);
      background: var(--primary);
      color: var(--primary-foreground);
    }

    .rn__link {
      min-height: 32px;
      padding: 0;
      border: 0;
      background: none;
      color: var(--earth);
      font-size: 0.8125rem;
      text-decoration: underline;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandRename {
  private readonly store = inject(AdminBrandStore);
  readonly brand = input.required<string>();
  readonly renamed = output<string>();

  protected readonly editing = signal(false);
  protected readonly draft = signal('');
  protected readonly tried = signal(false);
  protected readonly usage = computed(() => this.store.usage(this.brand()));
  protected readonly problems = computed(() => this.store.problems(this.brand(), this.draft()));

  protected start(): void {
    this.draft.set(this.brand());
    this.tried.set(false);
    this.editing.set(true);
  }

  protected save(): void {
    this.tried.set(true);
    if (this.draft().trim() === this.brand()) {
      this.editing.set(false);
      return;
    }
    if (this.problems().length) return;
    this.store.rename(this.brand(), this.draft());
    this.renamed.emit(this.draft().trim());
    this.editing.set(false);
  }
}
