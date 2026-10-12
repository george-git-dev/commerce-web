import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Affiliate } from '../../../core/models/affiliate';
import { AdminAffiliates } from '../services/admin-affiliates';

/** Aprovar afiliado: confirma o código do cupom (sugerido pelo nome). Fecha com o código. */
@Component({
  selector: 'app-approve-affiliate-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Aprovar {{ data.name }}</h2>
    <form (submit)="$event.preventDefault(); confirm()" novalidate>
      <mat-dialog-content>
        <p>
          Cria o cupom de {{ store.program().buyerDiscountPercent }}% para os seguidores e a
          comissão de {{ data.commissionPercent }}% em cada venda entregue.
        </p>
        <label class="aa__field">
          Código do cupom
          <input
            class="aa__code"
            maxlength="20"
            autocomplete="off"
            spellcheck="false"
            [value]="code()"
            [attr.aria-invalid]="(tried() && !!problem()) || null"
            (input)="code.set($any($event.target).value.toUpperCase())"
            cdkFocusInitial
          />
          @if (tried() && problem(); as message) {
            <small role="alert">{{ message }}</small>
          } @else {
            <small class="aa__hint"
              >É o que a pessoa vai divulgar. Depois do 1º uso não muda.</small
            >
          }
        </label>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Voltar</button>
        <button matButton="filled" type="submit">Aprovar e criar cupom</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    p {
      margin: 0 0 12px;
    }

    .aa__field {
      display: grid;
      gap: 6px;
      font-size: 0.8125rem;
      color: var(--muted-foreground);

      small {
        color: var(--wine);
      }

      .aa__hint {
        color: var(--muted-foreground);
      }
    }

    .aa__code {
      min-height: 48px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--background);
      color: var(--foreground);
      font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
      font-size: 1rem;
      letter-spacing: 0.06em;

      &[aria-invalid='true'] {
        border-color: var(--wine);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApproveAffiliateDialog {
  protected readonly data = inject<Affiliate>(MAT_DIALOG_DATA);
  protected readonly store = inject(AdminAffiliates);
  private readonly ref = inject(MatDialogRef<ApproveAffiliateDialog, string>);
  protected readonly code = signal(this.store.suggestCode(this.data));
  protected readonly tried = signal(false);
  protected readonly problem = computed(() => this.store.codeProblem(this.code()));

  protected confirm(): void {
    this.tried.set(true);
    if (!this.problem()) this.ref.close(this.code());
  }
}
