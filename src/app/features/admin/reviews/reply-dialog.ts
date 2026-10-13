import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { REPLY_MAX, replyProblem } from '../../../core/utils/review-text';

export interface ReplyDialogData {
  authorName: string;
  comment: string;
  current?: string;
}

/**
 * Resposta da loja a uma avaliação. Aparece no produto como "Resposta da Nani
 * Perfumes" (nunca com o nome de quem respondeu). Fecha com o texto.
 */
@Component({
  selector: 'app-reply-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.current ? 'Editar resposta' : 'Responder avaliação' }}</h2>
    <mat-dialog-content>
      <blockquote class="rp__quote">
        <strong>{{ data.authorName }}</strong> {{ data.comment }}
      </blockquote>
      <label class="rp__field">
        Resposta da loja (aparece no produto)
        <textarea
          rows="5"
          [value]="text()"
          [attr.maxlength]="max"
          placeholder="Ex.: Obrigado pelo retorno! Para fixar mais, aplique também na roupa."
          (input)="text.set($any($event.target).value)"
        ></textarea>
      </label>
      <p class="rp__hint">
        <span>{{ text().trim().length }}/{{ max }}</span>
        Sem link e sem dados do cliente. Assinada como "Nani Perfumes".
      </p>
      @if (touched() && problem()) {
        <small class="rp__error" role="alert">{{ problem() }}</small>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Voltar</button>
      <button matButton="filled" type="button" (click)="confirm()">Publicar resposta</button>
    </mat-dialog-actions>
  `,
  styles: `
    .rp__quote {
      margin: 0 0 12px;
      padding: 8px 12px;
      border-left: 3px solid var(--border);
      color: var(--muted-foreground);
      font-size: 0.875rem;
    }

    .rp__field {
      display: grid;
      gap: 6px;
      font-size: 0.8125rem;

      textarea {
        padding: 10px 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--background);
        font: inherit;
        font-size: 1rem;
        resize: vertical;
      }
    }

    .rp__hint {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 10px;
      margin: 6px 0 0;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .rp__error {
      display: block;
      margin-top: 6px;
      color: var(--wine);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReplyDialog {
  protected readonly data = inject<ReplyDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ReplyDialog, string>);
  protected readonly max = REPLY_MAX;
  protected readonly text = signal(this.data.current ?? '');
  protected readonly touched = signal(false);
  protected readonly problem = computed(() => replyProblem(this.text()));

  protected confirm(): void {
    this.touched.set(true);
    if (this.problem()) return;
    this.ref.close(this.text().trim());
  }
}
