import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AffiliateProgramSettings } from '../../../core/services/affiliate-program';
import { AdminAffiliates } from '../services/admin-affiliates';

const num = (text: string) => Number(text.trim().replace(',', '.'));

/** Aba "Configurações" de Afiliados: liga/pausa o programa (com período) e os padrões. */
@Component({
  selector: 'app-program-settings',
  imports: [MatButtonModule],
  template: `
    <form class="ps" (submit)="$event.preventDefault(); save()" novalidate>
      <fieldset [disabled]="!store.canManage()">
        <p class="ps__status" [class.ps__status--off]="!store.programLive()">
          Programa {{ store.programLive() ? 'no ar' : 'fora do ar' }}
          <small>
            Quando fora do ar, "Seja afiliado" some da loja, ninguém pede para entrar e os cupons
            dos afiliados param de valer. Comissões já ganhas continuam sendo pagas.
          </small>
        </p>

        <label class="ps__check">
          <input
            type="checkbox"
            [checked]="active()"
            (change)="active.set($any($event.target).checked)"
          />
          Programa ligado
        </label>
        <div class="ps__row">
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

        <h3>Padrões para novos afiliados</h3>
        <div class="ps__row">
          <label>
            Desconto do cupom (%)
            <input
              inputmode="decimal"
              [value]="discount()"
              (input)="discount.set($any($event.target).value)"
            />
          </label>
          <label>
            Comissão (%)
            <input
              inputmode="decimal"
              [value]="commission()"
              (input)="commission.set($any($event.target).value)"
            />
          </label>
        </div>
        <p class="ps__hint">
          Quem já é afiliado mantém o que tem; para mudar, use "Editar" no card.
        </p>

        <h3>Pagamento</h3>
        <div class="ps__row">
          <label>
            Mínimo do Pix (R$)
            <input
              inputmode="decimal"
              [value]="minPayout()"
              (input)="minPayout.set($any($event.target).value)"
            />
          </label>
          <label>
            Bônus do crédito na loja (%)
            <input
              inputmode="decimal"
              [value]="bonus()"
              (input)="bonus.set($any($event.target).value)"
            />
          </label>
        </div>
        <p class="ps__hint">
          Fixos: comissão liberada {{ store.program().holdDays }} dias depois da entrega (prazo de
          arrependimento) e crédito válido por
          {{ store.program().storeCreditValidityMonths }} meses.
        </p>

        @if (tried() && problems().length) {
          <ul class="ps__problems" role="alert">
            @for (p of problems(); track p) {
              <li>{{ p }}</li>
            }
          </ul>
        }
      </fieldset>
      @if (store.canManage()) {
        <div class="ps__actions">
          <button matButton="filled" type="submit" class="ui-cta">Salvar configurações</button>
        </div>
      }
    </form>
  `,
  styles: `
    .ps {
      display: grid;
      gap: 14px;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
    }

    fieldset {
      display: grid;
      gap: 14px;
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }

    h3 {
      margin: 6px 0 0;
      font-size: 1.0625rem;
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

    .ps__row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .ps__check {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      font-size: 0.9375rem;
      color: var(--foreground);

      input {
        width: 20px;
        height: 20px;
        accent-color: var(--primary);
      }
    }

    .ps__status {
      display: grid;
      gap: 4px;
      margin: 0;
      padding: 12px;
      border-radius: var(--radius-sm);
      background: color-mix(in oklch, var(--gold) 14%, transparent);
      color: var(--earth);
      font-weight: 600;

      small {
        font-weight: 400;
        font-size: 0.8125rem;
      }
    }

    .ps__status--off {
      background: color-mix(in oklch, var(--wine) 10%, transparent);
      color: var(--wine);
    }

    .ps__hint {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }

    .ps__problems {
      margin: 0;
      padding: 10px 12px 10px 30px;
      border-radius: var(--radius-sm);
      background: color-mix(in oklch, var(--wine) 10%, transparent);
      color: var(--wine);
      font-size: 0.875rem;
    }

    .ps__actions {
      display: flex;
      justify-content: flex-end;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramSettings {
  protected readonly store = inject(AdminAffiliates);
  private readonly snackBar = inject(MatSnackBar);
  private readonly current = this.store.program();

  protected readonly active = signal(this.current.active);
  protected readonly startsOn = signal(this.current.startsOn ?? '');
  protected readonly endsOn = signal(this.current.endsOn ?? '');
  protected readonly discount = signal(String(this.current.buyerDiscountPercent));
  protected readonly commission = signal(String(this.current.commissionPercent));
  protected readonly minPayout = signal(String(this.current.minPayout));
  protected readonly bonus = signal(String(this.current.storeCreditBonusPercent));
  protected readonly tried = signal(false);

  private readonly draft = computed<AffiliateProgramSettings>(() => ({
    active: this.active(),
    startsOn: this.startsOn() || undefined,
    endsOn: this.endsOn() || undefined,
    buyerDiscountPercent: num(this.discount()),
    commissionPercent: num(this.commission()),
    minPayout: num(this.minPayout()),
    storeCreditBonusPercent: num(this.bonus()),
  }));
  protected readonly problems = computed(() => this.store.programProblems(this.draft()));

  protected save(): void {
    this.tried.set(true);
    if (this.problems().length) return;
    if (this.store.saveProgram(this.draft())) {
      this.snackBar.open(
        this.store.programLive() ? 'Programa salvo — no ar.' : 'Programa salvo — fora do ar.',
        'Fechar',
        { duration: 3000 },
      );
    }
  }
}
