import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NonNegative } from '../../../shared/input-mask/non-negative';
import { ADJUST_REASONS, adjustProblems, StockDirection } from '../services/stock-rules';

export interface StockAdjustData {
  label: string;
  current: number;
}

export interface StockAdjustResult {
  direction: StockDirection;
  quantity: number;
  reason: string;
  note: string;
}

/** Entrada ou saída manual: quantidade, motivo obrigatório e observação. */
@Component({
  selector: 'app-stock-adjust-dialog',
  imports: [MatButtonModule, MatDialogModule, NonNegative],
  template: `
    <h2 mat-dialog-title>Ajustar estoque</h2>
    <form (submit)="$event.preventDefault(); confirm()" novalidate>
      <mat-dialog-content>
        <p class="sa__item">{{ data.label }}</p>
        <div class="sa__dir" role="group" aria-label="Tipo de ajuste">
          @for (option of directions; track option.id) {
            <button
              type="button"
              [attr.aria-pressed]="direction() === option.id"
              (click)="setDirection(option.id)"
            >
              {{ option.label }}
            </button>
          }
        </div>
        <label class="sa__field">
          Quantidade (unidades)
          <input
            type="number"
            inputmode="numeric"
            appNonNegative="integer"
            min="1"
            [value]="quantity() ?? ''"
            [attr.aria-invalid]="(tried() && !validQty()) || null"
            (input)="quantity.set($any($event.target).value)"
            cdkFocusInitial
          />
        </label>
        <label class="sa__field">
          Motivo
          <select
            [attr.aria-invalid]="(tried() && !reason()) || null"
            (change)="reason.set($any($event.target).value)"
          >
            <option value="" disabled [selected]="!reason()">Escolha o motivo</option>
            @for (item of reasons(); track item) {
              <option [value]="item" [selected]="item === reason()">{{ item }}</option>
            }
          </select>
        </label>
        <label class="sa__field">
          Observação (opcional)
          <textarea
            rows="2"
            maxlength="200"
            [value]="note()"
            (input)="note.set($any($event.target).value)"
          ></textarea>
        </label>
        <p class="sa__preview">
          Estoque: <strong>{{ data.current }}</strong> →
          <strong [class.sa__neg]="after() < 0">{{ after() }}</strong> un.
        </p>
        @if (tried() && problems().length) {
          <ul class="sa__problems" role="alert">
            @for (problem of problems(); track problem) {
              <li>{{ problem }}</li>
            }
          </ul>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Voltar</button>
        <button matButton="filled" type="submit">Confirmar ajuste</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-content {
      display: grid;
      gap: 12px;
    }

    p {
      margin: 0;
    }

    .sa__item {
      color: var(--muted-foreground);
    }

    .sa__dir {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;

      button {
        min-height: 44px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--card);
        font: inherit;
        cursor: pointer;

        &[aria-pressed='true'] {
          border-color: var(--primary);
          background: var(--primary);
          color: var(--primary-foreground);
        }
      }
    }

    .sa__field {
      display: grid;
      gap: 6px;
      font-size: 0.8125rem;

      input,
      select,
      textarea {
        min-height: 48px;
        padding: 8px 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--background);
        font: inherit;
        font-size: 1rem;

        &[aria-invalid='true'] {
          border-color: var(--wine);
        }
      }
    }

    .sa__neg,
    .sa__problems {
      color: var(--wine);
    }

    .sa__problems {
      margin: 0;
      padding-left: 18px;
      font-size: 0.875rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAdjustDialog {
  protected readonly data = inject<StockAdjustData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<StockAdjustDialog, StockAdjustResult>);

  protected readonly directions = [
    { id: 'entrada', label: '+ Entrada' },
    { id: 'saida', label: '− Saída' },
  ] as const;
  protected readonly direction = signal<StockDirection>('entrada');
  protected readonly quantity = signal<string | null>(null);
  protected readonly reason = signal('');
  protected readonly note = signal('');
  protected readonly tried = signal(false);

  protected readonly reasons = computed(() => ADJUST_REASONS[this.direction()]);
  protected readonly validQty = computed(() => {
    const qty = Number(this.quantity());
    return !!this.quantity() && Number.isInteger(qty) && qty > 0;
  });
  protected readonly after = computed(() => {
    const qty = this.validQty() ? Number(this.quantity()) : 0;
    return this.data.current + (this.direction() === 'entrada' ? qty : -qty);
  });
  protected readonly problems = computed(() =>
    adjustProblems(this.data.current, this.direction(), this.quantity(), this.reason()),
  );

  /** Trocar a direção limpa o motivo (cada direção tem os seus). */
  protected setDirection(direction: StockDirection): void {
    this.direction.set(direction);
    if (!ADJUST_REASONS[direction].includes(this.reason())) this.reason.set('');
  }

  protected confirm(): void {
    this.tried.set(true);
    if (this.problems().length) return;
    this.ref.close({
      direction: this.direction(),
      quantity: Number(this.quantity()),
      reason: this.reason(),
      note: this.note().trim(),
    });
  }
}
