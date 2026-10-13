import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { RETURN_REASON_LABELS, ReturnReason } from '../../../core/models/return-request';
import { AdminOrder } from '../data/admin-orders-mock';
import { AdminReturns } from '../services/admin-returns';

/** Registrar devolução combinada com o cliente (nasce aprovada, esperando o produto). */
@Component({
  selector: 'app-register-return-dialog',
  imports: [CurrencyPipe, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Registrar devolução · {{ data.number }}</h2>
    <form (submit)="$event.preventDefault(); save()" novalidate>
      <mat-dialog-content class="rg">
        <fieldset>
          <legend>Itens que vão voltar</legend>
          @for (line of lines(); track line.id) {
            <div class="rg__item" [class.rg__item--off]="!line.max">
              <span>
                <strong>{{ line.item.name }}</strong>
                <small
                  >{{ line.item.variant }} · {{ line.item.unitPrice | currency: 'BRL' }} ·
                  {{ line.max ? 'até ' + line.max : 'já devolvido' }}</small
                >
              </span>
              <select
                [disabled]="!line.max"
                [attr.aria-label]="'Quantidade de ' + line.item.name"
                (change)="setQuantity(line.id, +$any($event.target).value)"
              >
                @for (n of range(line.max); track n) {
                  <option [value]="n" [selected]="n === quantityOf(line.id)">
                    {{ n }}
                  </option>
                }
              </select>
            </div>
          }
        </fieldset>

        <label class="rg__field">
          Motivo
          <select (change)="reason.set($any($event.target).value || null)">
            <option value="">Escolha</option>
            @for (r of reasons; track r[0]) {
              <option [value]="r[0]" [selected]="reason() === r[0]">{{ r[1] }}</option>
            }
          </select>
        </label>
        @if (late(); as warning) {
          <p class="rg__warn">{{ warning }} Você pode registrar mesmo assim (decisão da loja).</p>
        }
        <label class="rg__field">
          O que o cliente contou
          <textarea
            rows="3"
            maxlength="500"
            [value]="description()"
            (input)="description.set($any($event.target).value)"
          ></textarea>
        </label>

        @if (tried() && problems().length) {
          <ul class="rg__problems" role="alert">
            @for (p of problems(); track p) {
              <li>{{ p }}</li>
            }
          </ul>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Voltar</button>
        <button matButton="filled" type="submit">Registrar</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .rg {
      display: grid;
      gap: 14px;
    }

    fieldset {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      border: 0;
    }

    legend {
      margin-bottom: 6px;
      padding: 0;
      font-weight: 600;
    }

    .rg__item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);

      span {
        display: grid;
        min-width: 0;
      }

      small {
        font-size: 0.75rem;
        color: var(--muted-foreground);
      }
    }

    .rg__item--off {
      opacity: 0.55;
    }

    select,
    textarea {
      min-height: 40px;
      padding: 0 8px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--background);
      color: var(--foreground);
      font: inherit;
    }

    textarea {
      padding: 8px 10px;
      font-size: 1rem;
    }

    .rg__field {
      display: grid;
      gap: 6px;
      font-size: 0.8125rem;
      color: var(--muted-foreground);

      select,
      textarea {
        width: 100%;
      }
    }

    .rg__warn {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--radius-sm);
      background: color-mix(in oklch, var(--gold) 14%, transparent);
      font-size: 0.8125rem;
    }

    .rg__problems {
      margin: 0;
      padding: 10px 12px 10px 30px;
      border-radius: var(--radius-sm);
      background: color-mix(in oklch, var(--wine) 10%, transparent);
      color: var(--wine);
      font-size: 0.875rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterReturnDialog {
  protected readonly data = inject<AdminOrder>(MAT_DIALOG_DATA);
  private readonly store = inject(AdminReturns);
  private readonly ref = inject(MatDialogRef<RegisterReturnDialog, boolean>);
  protected readonly reasons = Object.entries(RETURN_REASON_LABELS) as [ReturnReason, string][];
  protected readonly lines = computed(() => this.store.returnable(this.data));
  protected readonly quantities = signal<Readonly<Record<string, number>>>({});
  protected readonly reason = signal<ReturnReason | null>(null);
  protected readonly description = signal('');
  protected readonly tried = signal(false);

  private readonly chosen = computed(() =>
    Object.entries(this.quantities())
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity })),
  );
  protected readonly late = computed(() => this.store.lateWarning(this.data, this.reason()));
  protected readonly problems = computed(() =>
    this.store.registerProblems(this.data, this.chosen(), this.reason(), this.description()),
  );

  protected range(max: number): number[] {
    return Array.from({ length: max + 1 }, (_, i) => i);
  }

  protected quantityOf(id: string): number {
    return this.quantities()[id] ?? 0;
  }

  protected setQuantity(id: string, n: number): void {
    this.quantities.update((all) => ({ ...all, [id]: n }));
  }

  protected save(): void {
    this.tried.set(true);
    if (this.problems().length) return;
    this.ref.close(
      !!this.store.register(this.data, this.chosen(), this.reason()!, this.description()),
    );
  }
}
