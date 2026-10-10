import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { REJECT_REASONS } from '../services/review-moderation';

export interface RejectReviewDialogData {
  /** true = já publicada (vira "Tirar do ar"). */
  published: boolean;
}

/** Motivo da reprovação: um da lista ou "Outro" com texto. Fecha com o motivo. */
@Component({
  selector: 'app-reject-review-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>
      {{ data.published ? 'Tirar a avaliação do ar?' : 'Reprovar a avaliação?' }}
    </h2>
    <mat-dialog-content>
      <p>O cliente vê só "Não publicada". O motivo fica para a equipe.</p>
      <fieldset class="rr__options" aria-label="Motivo">
        @for (reason of reasons; track reason) {
          <label class="rr__option" [class.rr__option--on]="choice() === reason">
            <input type="radio" name="reason" (change)="choice.set(reason)" />
            {{ reason }}
          </label>
        }
        <label class="rr__option" [class.rr__option--on]="choice() === 'outro'">
          <input type="radio" name="reason" (change)="choice.set('outro')" />
          Outro
        </label>
      </fieldset>
      @if (choice() === 'outro') {
        <input
          class="rr__other"
          placeholder="Qual o motivo?"
          maxlength="120"
          aria-label="Outro motivo"
          (input)="other.set($any($event.target).value)"
        />
      }
      @if (error()) {
        <small class="rr__error" role="alert">{{ error() }}</small>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Voltar</button>
      <button matButton="filled" type="button" class="rr__danger" (click)="confirm()">
        {{ data.published ? 'Tirar do ar' : 'Reprovar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    p {
      margin: 0 0 12px;
      color: var(--muted-foreground);
    }

    .rr__options {
      display: grid;
      gap: 6px;
      margin: 0;
      padding: 0;
      border: 0;
    }

    .rr__option {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;

      input {
        accent-color: var(--earth);
      }

      &--on {
        border-color: var(--gold);
        background: var(--gold-soft);
      }
    }

    .rr__other {
      width: 100%;
      height: 44px;
      margin-top: 8px;
      padding-inline: 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--background);
      font: inherit;
    }

    .rr__error {
      display: block;
      margin-top: 8px;
      color: var(--wine);
    }

    .rr__danger {
      --mat-button-filled-container-color: var(--wine);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RejectReviewDialog {
  protected readonly data = inject<RejectReviewDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<RejectReviewDialog, string>);
  protected readonly reasons = REJECT_REASONS;
  protected readonly choice = signal<string | null>(null);
  protected readonly other = signal('');
  protected readonly error = signal('');

  protected confirm(): void {
    const choice = this.choice();
    if (!choice) return this.error.set('Escolha um motivo.');
    if (choice === 'outro') {
      const text = this.other().trim();
      if (text.length < 3) return this.error.set('Escreva o motivo.');
      return this.ref.close(text);
    }
    this.ref.close(choice);
  }
}
