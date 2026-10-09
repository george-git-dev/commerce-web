import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { deletionReasonProblem } from '../services/customer-rules';

export interface DeleteCustomerDialogData {
  id: number;
  name: string;
  email: string;
}

/**
 * Exclusão de cadastro (LGPD), irreversível: digita o e-mail do cliente para
 * confirmar e informa o motivo. Fecha com o motivo (string) ou nada.
 */
@Component({
  selector: 'app-delete-customer-dialog',
  imports: [MatButtonModule, MatDialogModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Excluir o cadastro de {{ data.name }}?</h2>
    <form (submit)="$event.preventDefault(); confirm()" novalidate>
      <mat-dialog-content>
        <p>
          <strong>Não tem volta.</strong> Nome, e-mail, telefone, CPF e endereços são apagados e a
          conta deixa de entrar. Os pedidos ficam (obrigação fiscal) como "Cliente excluído #{{
            data.id
          }}".
        </p>
        <label class="dc__field">
          Digite o e-mail do cliente para confirmar
          <input
            [formControl]="email"
            autocomplete="off"
            inputmode="email"
            [attr.aria-invalid]="(email.invalid && email.touched) || null"
          />
          @if (email.invalid && email.touched) {
            <small role="alert">O e-mail não confere.</small>
          }
        </label>
        <label class="dc__field">
          Motivo (vai para a auditoria)
          <input
            [formControl]="reason"
            placeholder="Ex.: pedido do cliente pelo WhatsApp em 09/10"
            [attr.aria-invalid]="(reason.invalid && reason.touched) || null"
          />
          @if (reason.invalid && reason.touched) {
            <small role="alert">Explique o motivo (5 a 200 caracteres).</small>
          }
        </label>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Voltar</button>
        <button matButton="filled" type="submit" class="dc__danger">Excluir cadastro</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    p {
      margin: 0 0 12px;
      color: var(--muted-foreground);
    }

    .dc__field {
      display: grid;
      gap: 6px;
      margin-top: 12px;
      font-size: 0.8125rem;

      input {
        height: 48px;
        padding-inline: 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--background);
        font: inherit;
        font-size: 1rem;

        &[aria-invalid='true'] {
          border-color: var(--wine);
        }
      }

      small {
        color: var(--wine);
      }
    }

    .dc__danger {
      --mat-button-filled-container-color: var(--wine);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteCustomerDialog {
  protected readonly data = inject<DeleteCustomerDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<DeleteCustomerDialog, string>);

  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      (control) =>
        control.value.trim().toLowerCase() === this.data.email.toLowerCase()
          ? null
          : { mismatch: true },
    ],
  });
  protected readonly reason = new FormControl('', {
    nonNullable: true,
    validators: [(control) => (deletionReasonProblem(control.value) ? { reason: true } : null)],
  });

  protected confirm(): void {
    if (this.email.invalid || this.reason.invalid) {
      this.email.markAsTouched();
      this.reason.markAsTouched();
      return;
    }
    this.ref.close(this.reason.value.trim());
  }
}
