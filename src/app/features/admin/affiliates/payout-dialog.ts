import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Affiliate } from '../../../core/models/affiliate';
import { PayoutReceipt } from '../../../core/models/commission';
import { RECEIPT_TYPES, receiptProblem } from '../../../core/utils/commission-rules';
import { AdminCommissions } from '../services/admin-commissions';

/**
 * "Fazer pagamento" de UM afiliado. Pix: mostra a chave e o valor, a equipe
 * faz o Pix no banco e anexa o comprovante (o afiliado vê depois). Crédito na
 * loja: lança o saldo com bônus na hora. Fecha com o pagamento feito (ou nada).
 */
@Component({
  selector: 'app-payout-dialog',
  imports: [CurrencyPipe, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Pagar {{ data.name }}</h2>
    <mat-dialog-content>
      <dl class="pd__facts">
        <div>
          <dt>Comissões liberadas</dt>
          <dd>{{ plan.commissionIds.length }} · {{ plan.amount | currency: 'BRL' }}</dd>
        </div>
        <div>
          <dt>Forma escolhida</dt>
          <dd>
            {{
              isPix ? 'Pix' : 'Crédito na loja (+' + store.program.storeCreditBonusPercent + '%)'
            }}
          </dd>
        </div>
      </dl>

      @if (isPix) {
        <div class="pd__pix">
          <p class="pd__label">Valor do Pix</p>
          <p class="pd__value">{{ plan.paidAmount | currency: 'BRL' }}</p>
          <p class="pd__label">Chave Pix</p>
          <div class="pd__key">
            <code>{{ pixKey }}</code>
            <button matButton type="button" (click)="copyKey()">
              <mat-icon>content_copy</mat-icon> Copiar
            </button>
          </div>
          <p class="pd__hint">Faça o Pix pelo app do banco e anexe o comprovante.</p>
        </div>

        <label class="pd__file">
          <span>Comprovante (PDF ou imagem, até 5 MB)</span>
          <input
            type="file"
            [attr.accept]="accept"
            (change)="pick($any($event.target).files?.[0] ?? null)"
          />
        </label>
        @if (file(); as f) {
          <p class="pd__picked">
            <mat-icon aria-hidden="true">{{
              f.type === 'application/pdf' ? 'picture_as_pdf' : 'image'
            }}</mat-icon>
            {{ f.name }}
          </p>
        }
        @if (tried() && problem(); as message) {
          <p class="pd__error" role="alert">{{ message }}</p>
        }
      } @else {
        <p class="pd__credit">
          Lança <strong>{{ plan.paidAmount | currency: 'BRL' }}</strong> de crédito na conta de
          {{ data.name }} (R$ {{ plan.amount.toFixed(2).replace('.', ',') }} + bônus). Vale
          {{ store.program.storeCreditValidityMonths }} meses; não precisa de comprovante.
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Voltar</button>
      <button matButton="filled" type="button" (click)="confirm()">
        {{ isPix ? 'Concluir pagamento' : 'Lançar crédito' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .pd__facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin: 0 0 14px;

      dt {
        font-size: 0.75rem;
        color: var(--muted-foreground);
      }

      dd {
        margin: 0;
        font-weight: 600;
      }
    }

    .pd__pix {
      display: grid;
      gap: 4px;
      padding: 12px;
      border-radius: var(--radius-sm);
      background: color-mix(in oklch, var(--gold) 10%, transparent);
    }

    .pd__label {
      margin: 6px 0 0;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .pd__value {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .pd__key {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 8px;

      code {
        font-size: 0.9375rem;
        overflow-wrap: anywhere;
      }
    }

    .pd__hint {
      margin: 6px 0 0;
      font-size: 0.8125rem;
      color: var(--earth);
    }

    .pd__file {
      display: grid;
      gap: 6px;
      margin-top: 14px;
      font-size: 0.8125rem;
      color: var(--muted-foreground);

      input {
        max-width: 100%;
        font: inherit;
        color: var(--foreground);
      }
    }

    .pd__picked {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 8px 0 0;
      font-size: 0.875rem;
      overflow-wrap: anywhere;
    }

    .pd__error {
      margin: 8px 0 0;
      font-size: 0.8125rem;
      color: var(--wine);
    }

    .pd__credit {
      margin: 0;
      font-size: 0.9375rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayoutDialog {
  protected readonly data = inject<Affiliate>(MAT_DIALOG_DATA);
  protected readonly store = inject(AdminCommissions);
  private readonly ref = inject(MatDialogRef<PayoutDialog, boolean>);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly plan = this.store.preview(this.data);
  protected readonly isPix = this.data.payoutMethod === 'pix';
  protected readonly pixKey = this.store.pixToPay(this.data);
  protected readonly accept = RECEIPT_TYPES.join(',');
  protected readonly file = signal<File | null>(null);
  protected readonly tried = signal(false);
  protected readonly problem = computed(() => receiptProblem(this.file()));

  protected pick(file: File | null): void {
    this.file.set(file);
  }

  protected async copyKey(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.pixKey);
      this.snackBar.open('Chave Pix copiada.', 'Fechar', { duration: 2500 });
    } catch {
      this.snackBar.open('Copie a chave manualmente.', 'Fechar', { duration: 3000 });
    }
  }

  protected confirm(): void {
    this.tried.set(true);
    let receipt: PayoutReceipt | undefined;
    if (this.isPix) {
      const file = this.file();
      if (this.problem() || !file) return;
      // Mock: URL local do arquivo. Fase 2: upload para o S3 privado.
      receipt = {
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
      };
    }
    const payout = this.store.pay(this.data, receipt);
    this.ref.close(!!payout);
  }
}
