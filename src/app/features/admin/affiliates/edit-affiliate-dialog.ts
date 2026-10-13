import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Affiliate } from '../../../core/models/affiliate';
import { normalizeCode } from '../../../core/utils/coupon-rules';
import { AdminAffiliates, AffiliateEdit } from '../services/admin-affiliates';

const num = (text: string) => Number(text.trim().replace(',', '.'));

/**
 * Editar afiliado: comissão, desconto e código do cupom, ativo/pausado e
 * período. Fecha com `true` quando salvou.
 */
@Component({
  selector: 'app-edit-affiliate-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Editar {{ data.name }}</h2>
    <form (submit)="$event.preventDefault(); save()" novalidate>
      <mat-dialog-content class="ea">
        <div class="ea__row">
          <label>
            Comissão (%)
            <input
              inputmode="decimal"
              [value]="commission()"
              (input)="commission.set($any($event.target).value)"
            />
            <small>Vale para vendas novas.</small>
          </label>
          <label>
            Desconto do cupom (%)
            <input
              inputmode="decimal"
              [value]="discount()"
              (input)="discount.set($any($event.target).value)"
            />
            <small>O que o seguidor ganha.</small>
          </label>
        </div>

        <label>
          Código do cupom
          <input
            class="ea__code"
            maxlength="20"
            autocomplete="off"
            spellcheck="false"
            [value]="code()"
            (input)="code.set($any($event.target).value.toUpperCase())"
          />
        </label>
        @if (codeChanged() && couponUsed) {
          <label>
            O cupom {{ data.couponCode }} continua valendo até (opcional)
            <input
              type="date"
              [min]="today"
              [value]="oldUntil()"
              (input)="oldUntil.set($any($event.target).value)"
            />
            <small>
              Ele já tem vendas, então não é renomeado: nasce o {{ newCode() }} e o
              {{ data.couponCode }} vale até essa data (para quem já tem o print). Vazio = desativa
              já.
            </small>
          </label>
        }

        <label class="ea__check">
          <input
            type="checkbox"
            [checked]="active()"
            (change)="active.set($any($event.target).checked)"
          />
          <span>
            Participação ativa
            <small>Pausado: o cupom não vale e não gera comissão (o que já ganhou continua).</small>
          </span>
        </label>
        <div class="ea__row">
          <label>
            De (opcional)
            <input
              type="date"
              [value]="startsOn()"
              (input)="startsOn.set($any($event.target).value)"
            />
          </label>
          <label>
            Até (opcional)
            <input
              type="date"
              [min]="startsOn()"
              [value]="endsOn()"
              (input)="endsOn.set($any($event.target).value)"
            />
          </label>
        </div>

        @if (warn()) {
          <label class="ea__check ea__warn">
            <input
              type="checkbox"
              [checked]="confirmMargin()"
              (change)="confirmMargin.set($any($event.target).checked)"
            />
            <span>
              Desconto + comissão = {{ edit().discountPercent + edit().commissionPercent }}% de cada
              venda. Confirmo que quero assim.
            </span>
          </label>
        }

        @if (tried() && problems().length) {
          <ul class="ea__problems" role="alert">
            @for (p of problems(); track p) {
              <li>{{ p }}</li>
            }
          </ul>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Voltar</button>
        <button matButton="filled" type="submit">Salvar</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .ea {
      display: grid;
      gap: 14px;
    }

    label {
      display: grid;
      gap: 6px;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }

    input:not([type='checkbox']) {
      width: 100%;
      min-height: 46px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--background);
      color: var(--foreground);
      font: inherit;
      font-size: 1rem;
    }

    small {
      font-size: 0.75rem;
    }

    .ea__row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .ea__code {
      font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
      letter-spacing: 0.06em;
    }

    .ea__check {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 0.9375rem;
      color: var(--foreground);

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
        color: var(--muted-foreground);
      }
    }

    .ea__warn {
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      background: color-mix(in oklch, var(--gold) 14%, transparent);
      color: var(--earth);
    }

    .ea__problems {
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
export class EditAffiliateDialog {
  protected readonly data = inject<Affiliate>(MAT_DIALOG_DATA);
  protected readonly store = inject(AdminAffiliates);
  private readonly ref = inject(MatDialogRef<EditAffiliateDialog, boolean>);
  private readonly coupon = this.store.couponOf(this.data);
  protected readonly couponUsed = (this.coupon?.uses ?? 0) > 0;
  protected readonly today = new Date().toISOString().slice(0, 10);

  protected readonly commission = signal(String(this.data.commissionPercent));
  protected readonly discount = signal(
    String(this.coupon?.value ?? this.store.program().buyerDiscountPercent),
  );
  protected readonly code = signal(this.data.couponCode ?? '');
  protected readonly oldUntil = signal('');
  protected readonly active = signal(this.data.active);
  protected readonly startsOn = signal(this.data.startsOn ?? '');
  protected readonly endsOn = signal(this.data.endsOn ?? '');
  protected readonly confirmMargin = signal(false);
  protected readonly tried = signal(false);

  protected readonly newCode = computed(() => normalizeCode(this.code()));
  protected readonly codeChanged = computed(() => this.newCode() !== this.data.couponCode);
  protected readonly edit = computed<AffiliateEdit>(() => ({
    commissionPercent: num(this.commission()),
    discountPercent: num(this.discount()),
    code: this.newCode(),
    oldCodeUntil: this.codeChanged() && this.couponUsed ? this.oldUntil() || undefined : undefined,
    active: this.active(),
    startsOn: this.startsOn() || undefined,
    endsOn: this.endsOn() || undefined,
  }));
  protected readonly warn = computed(() => this.store.marginWarning(this.edit()));
  protected readonly problems = computed(() => {
    const problems = this.store.editProblems(this.data, this.edit());
    if (this.warn() && !this.confirmMargin()) {
      problems.push('Confirme o desconto + comissão acima de 30%.');
    }
    return problems;
  });

  protected save(): void {
    this.tried.set(true);
    if (this.problems().length) return;
    this.ref.close(this.store.update(this.data, this.edit()));
  }
}
