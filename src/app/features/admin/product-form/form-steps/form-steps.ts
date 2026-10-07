import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Indicador das etapas do cadastro. Dourada = etapa preenchida corretamente.
 * Dá para voltar a qualquer etapa; para frente, só se as anteriores estão completas.
 */
@Component({
  selector: 'app-form-steps',
  template: `
    <ol class="fs" aria-label="Etapas do cadastro">
      @for (step of steps(); track step; let i = $index) {
        <li>
          <button
            type="button"
            [class.fs--current]="current() === i"
            [class.fs--done]="done()[i] && current() !== i"
            [attr.aria-current]="current() === i ? 'step' : null"
            [disabled]="locked(i)"
            (click)="pick.emit(i)"
          >
            <span class="fs__n">{{ i + 1 }}</span>
            <span class="fs__label">{{ step }}</span>
          </button>
        </li>
      }
    </ol>
  `,
  styles: `
    .fs {
      display: flex;
      gap: 4px;
      margin: 0;
      padding: 0;
      overflow-x: auto;
      list-style: none;
      scrollbar-width: none;
    }

    li {
      flex: 1 0 auto;
    }

    button {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      min-height: 44px;
      padding: 6px 10px 8px;
      border: 0;
      border-bottom: 3px solid var(--border);
      background: none;
      color: var(--muted-foreground);
      font: inherit;
      font-size: 0.8125rem;
      white-space: nowrap;
      cursor: pointer;

      &:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
    }

    .fs__n {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--muted);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .fs--done {
      border-color: var(--gold);

      .fs__n {
        background: var(--gold);
        color: #fff;
      }
    }

    .fs--current {
      border-color: var(--primary);
      color: var(--foreground);
      font-weight: 600;

      .fs__n {
        background: var(--primary);
        color: var(--primary-foreground);
      }
    }

    // No celular só o número das outras etapas; o nome aparece na atual.
    @media (max-width: 699px) {
      button:not(.fs--current) .fs__label {
        display: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormSteps {
  readonly steps = input.required<readonly string[]>();
  readonly current = input(0);
  /** Etapas preenchidas corretamente (mesma ordem de `steps`). */
  readonly done = input<readonly boolean[]>([]);
  /** `false` = navegação livre (somente leitura). */
  readonly lockAhead = input(true);
  readonly pick = output<number>();

  protected locked(i: number): boolean {
    return this.lockAhead() && i > this.current() && !this.done().slice(0, i).every(Boolean);
  }
}
