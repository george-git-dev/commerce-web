import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PAYMENT_METHOD_LABELS } from '../../../core/models/order';
import { ReturnRequest } from '../../../core/models/return-request';
import { AdminReturns } from '../services/admin-returns';

/** Concluir devolução: o que voltou ao estoque (lacrado) + confirmação do estorno. */
@Component({
  selector: 'app-complete-return-dialog',
  imports: [CurrencyPipe, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Concluir devolução · {{ data.orderNumber }}</h2>
    <form (submit)="$event.preventDefault(); save()" novalidate>
      <mat-dialog-content class="cr">
        <p class="cr__lead">
          Volta ao estoque só o que chegou <strong>lacrado e intacto</strong>. Aberto ou avariado
          fica registrado como perda.
        </p>
        <ul class="cr__items">
          @for (item of data.items; track item.itemId) {
            <li>
              <span>
                <strong>{{ item.quantity }}× {{ item.name }}</strong>
                <small>{{ item.variant }}</small>
              </span>
              <label>
                Volta ao estoque
                <select
                  [value]="restock()[item.itemId]"
                  (change)="setRestock(item.itemId, +$any($event.target).value)"
                >
                  @for (n of range(item.quantity); track n) {
                    <option [value]="n" [selected]="n === restock()[item.itemId]">{{ n }}</option>
                  }
                </select>
              </label>
            </li>
          }
        </ul>

        <label class="cr__check">
          <input
            type="checkbox"
            [checked]="refunded()"
            (change)="refunded.set($any($event.target).checked)"
          />
          <span>
            Fiz o estorno de <strong>{{ data.refundAmount | currency: 'BRL' }}</strong> no
            {{ methodLabels[data.payment] }} (gateway).
            @if (data.shippingRefund) {
              <small
                >Inclui o frete de {{ data.shippingRefund | currency: 'BRL' }} (pedido
                inteiro).</small
              >
            }
          </span>
        </label>

        <label class="cr__note">
          Observação (opcional)
          <textarea
            rows="2"
            maxlength="300"
            [value]="note()"
            (input)="note.set($any($event.target).value)"
          ></textarea>
        </label>

        @if (tried() && problems().length) {
          <ul class="cr__problems" role="alert">
            @for (p of problems(); track p) {
              <li>{{ p }}</li>
            }
          </ul>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Voltar</button>
        <button matButton="filled" type="submit">Concluir devolução</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .cr {
      display: grid;
      gap: 14px;
    }

    .cr__lead {
      margin: 0;
      font-size: 0.875rem;
    }

    .cr__items {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
      }

      span {
        display: grid;
        min-width: 0;
      }

      small {
        font-size: 0.75rem;
        color: var(--muted-foreground);
      }

      label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8125rem;
      }

      select {
        min-height: 40px;
        padding: 0 8px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--background);
        font: inherit;
      }
    }

    .cr__check {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      font-size: 0.9375rem;

      input {
        flex: none;
        width: 20px;
        height: 20px;
        margin: 2px 0 0;
        accent-color: var(--primary);
      }

      span {
        display: grid;
        gap: 2px;
      }

      small {
        font-size: 0.75rem;
        color: var(--muted-foreground);
      }
    }

    .cr__note {
      display: grid;
      gap: 6px;
      font-size: 0.8125rem;
      color: var(--muted-foreground);

      textarea {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--background);
        color: var(--foreground);
        font: inherit;
        font-size: 1rem;
      }
    }

    .cr__problems {
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
export class CompleteReturnDialog {
  protected readonly data = inject<ReturnRequest>(MAT_DIALOG_DATA);
  private readonly store = inject(AdminReturns);
  private readonly ref = inject(MatDialogRef<CompleteReturnDialog, boolean>);
  protected readonly methodLabels = PAYMENT_METHOD_LABELS;

  /** Desistência: padrão é voltar tudo; defeito/errado: padrão é não voltar. */
  protected readonly restock = signal<Readonly<Record<string, number>>>(
    Object.fromEntries(
      this.data.items.map((i) => [
        i.itemId,
        this.data.reason === 'arrependimento' ? i.quantity : 0,
      ]),
    ),
  );
  protected readonly refunded = signal(false);
  protected readonly note = signal('');
  protected readonly tried = signal(false);

  private readonly received = computed(() =>
    this.data.items.map((i) => ({ itemId: i.itemId, restock: this.restock()[i.itemId] ?? 0 })),
  );
  protected readonly problems = computed(() =>
    this.store.completeProblems(this.data, this.received(), this.refunded()),
  );

  protected range(max: number): number[] {
    return Array.from({ length: max + 1 }, (_, i) => i);
  }

  protected setRestock(itemId: string, n: number): void {
    this.restock.update((all) => ({ ...all, [itemId]: n }));
  }

  protected save(): void {
    this.tried.set(true);
    if (this.problems().length) return;
    this.ref.close(this.store.complete(this.data, this.received(), this.refunded(), this.note()));
  }
}
