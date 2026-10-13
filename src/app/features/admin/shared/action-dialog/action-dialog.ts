import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ActionDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  /** Ação destrutiva (cancelar): botão em vinho. */
  danger?: boolean;
  /** Campo obrigatório antes de confirmar (rastreio, motivo). */
  field?: {
    label: string;
    placeholder?: string;
    error: string;
    validator?: ValidatorFn;
    uppercase?: boolean;
  };
}

/**
 * Confirmação das ações do backoffice. Fecha com o texto do campo (ou `true`
 * quando não há campo); `undefined` = desistiu.
 */
@Component({
  selector: 'app-action-dialog',
  imports: [MatButtonModule, MatDialogModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <form (submit)="$event.preventDefault(); confirm()" novalidate>
      <mat-dialog-content>
        <p>{{ data.message }}</p>
        @if (data.field; as field) {
          <label class="ad__field">
            {{ field.label }}
            <input
              [formControl]="value"
              [placeholder]="field.placeholder ?? ''"
              [class.ad__upper]="field.uppercase"
              [attr.aria-invalid]="(value.invalid && value.touched) || null"
              cdkFocusInitial
            />
            @if (value.invalid && value.touched) {
              <small role="alert">{{ field.error }}</small>
            }
          </label>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Voltar</button>
        <button matButton="filled" type="submit" [class.ad__danger]="data.danger">
          {{ data.confirmLabel }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    p {
      margin: 0 0 12px;
      color: var(--muted-foreground);
    }

    .ad__field {
      display: grid;
      gap: 6px;
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

    .ad__upper {
      text-transform: uppercase;
    }

    .ad__danger {
      --mat-button-filled-container-color: var(--wine);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionDialog {
  protected readonly data = inject<ActionDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ActionDialog, string | true>);

  protected readonly value = new FormControl('', {
    nonNullable: true,
    validators: this.data.field
      ? [Validators.required, ...(this.data.field.validator ? [this.data.field.validator] : [])]
      : [],
  });

  protected confirm(): void {
    if (!this.data.field) return this.ref.close(true);
    if (this.value.invalid) {
      this.value.markAsTouched();
      return;
    }
    this.ref.close(this.value.value.trim());
  }
}
