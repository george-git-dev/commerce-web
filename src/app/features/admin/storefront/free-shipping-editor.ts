import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth-service';
import {
  freeShippingPromoProblems,
  linkFromChoice,
  linkToText,
  moneyLabel,
  presetOf,
  SHOW_STATUS_LABELS,
  showStatus,
} from '../../../core/utils/storefront-rules';
import { NonNegative } from '../../../shared/input-mask/non-negative';
import { AdminStorefront } from '../services/admin-storefront';
import { LinkPicker } from './link-picker';

/**
 * Formulário da promoção de frete grátis (ativo, valor mínimo, período, aviso
 * na faixa e link). O MESMO formulário aparece na aba Configurações e no
 * diálogo da aba Avisos — os dois gravam a mesma regra.
 */
@Component({
  selector: 'app-free-shipping-editor',
  imports: [LinkPicker, MatButtonModule, NonNegative],
  template: `
    <form class="fs" (submit)="$event.preventDefault(); save()" novalidate>
      <p class="fs__status" [class]="'fs__status fs__status--' + status()">
        {{ statusLabels[status()] }} ·
        {{ active() ? 'Frete econômico grátis acima de ' + preview() : 'Frete normal para todos' }}
      </p>
      <fieldset [disabled]="readOnly">
        <label class="vf__check">
          <input
            type="checkbox"
            [checked]="active()"
            (change)="active.set($any($event.target).checked)"
          />
          Promoção de frete grátis ligada
        </label>
        <label>
          Frete econômico grátis em pedidos a partir de (R$)
          <input
            type="number"
            inputmode="decimal"
            appNonNegative
            min="1"
            step="0.01"
            [value]="value()"
            (input)="value.set($any($event.target).value)"
          />
        </label>
        <div class="vf__dates">
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
        <span class="vf__hint">
          Sem datas, vale até desligar. Fora do período o frete volta ao normal no carrinho e no
          checkout.
        </span>
        <label class="vf__check">
          <input
            type="checkbox"
            [checked]="notice()"
            (change)="notice.set($any($event.target).checked)"
          />
          Mostrar o aviso na faixa do topo
        </label>
        @if (notice()) {
          <app-link-picker [tried]="tried()" [(preset)]="preset" [(text)]="linkText" />
        }
      </fieldset>
      @if (tried() && problems().length) {
        <ul class="vf__problems" role="alert">
          @for (problem of problems(); track problem) {
            <li>{{ problem }}</li>
          }
        </ul>
      }
      @if (!readOnly) {
        <div class="vf__actions">
          @if (cancelLabel()) {
            <button matButton type="button" (click)="cancelled.emit()">{{ cancelLabel() }}</button>
          }
          <button matButton="filled" type="submit" class="ui-cta">Salvar</button>
        </div>
      }
    </form>
  `,
  styleUrls: ['./storefront-form.scss'],
  styles: `
    .fs {
      display: grid;
      gap: 14px;
    }

    fieldset {
      display: grid;
      gap: 14px;
    }

    // Situação: texto + cor (nunca só cor).
    .fs__status {
      margin: 0;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      background: var(--muted);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--earth);

      &--inativo,
      &--encerrado {
        color: var(--muted-foreground);
      }
    }

    .vf__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreeShippingEditor {
  private readonly store = inject(AdminStorefront);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly readOnly = !inject(AuthService).can('settings:edit');
  protected readonly statusLabels = SHOW_STATUS_LABELS;

  /** Texto do botão de voltar (só no diálogo). */
  readonly cancelLabel = input('');
  readonly saved = output();
  readonly cancelled = output();

  private readonly current = this.store.content.settings().freeShipping;
  protected readonly active = signal(this.current.active);
  protected readonly value = signal(String(this.current.min));
  protected readonly startsOn = signal(this.current.startsOn ?? '');
  protected readonly endsOn = signal(this.current.endsOn ?? '');
  protected readonly notice = signal(this.current.notice);
  protected readonly preset = signal(presetOf(this.current.link));
  protected readonly linkText = signal(
    presetOf(this.current.link) === 'custom' ? linkToText(this.current.link) : '',
  );
  protected readonly tried = signal(false);

  private readonly draft = computed(() => ({
    active: this.active(),
    min: this.value(),
    startsOn: this.startsOn() || undefined,
    endsOn: this.endsOn() || undefined,
    notice: this.notice(),
    link: this.notice() ? linkFromChoice(this.preset(), this.linkText()) : undefined,
  }));
  protected readonly problems = computed(() =>
    freeShippingPromoProblems(this.draft(), {
      preset: this.notice() ? this.preset() : '',
      text: this.linkText(),
    }),
  );
  protected readonly preview = computed(() => {
    const number = Number(this.value());
    return Number.isFinite(number) && number > 0 ? moneyLabel(Math.round(number * 100) / 100) : '—';
  });
  /** No ar, Agendado, Encerrado ou Inativo — como nos outros avisos. */
  protected readonly status = computed(() => showStatus(this.draft(), this.store.content.today()));

  protected save(): void {
    this.tried.set(true);
    if (this.readOnly || this.problems().length) return;
    const draft = this.draft();
    this.store.saveSettings({
      freeShipping: { ...draft, min: Math.round(Number(draft.min) * 100) / 100 },
    });
    this.snackBar.open('Frete grátis salvo — a loja já usa a nova regra.', 'Fechar', {
      duration: 3000,
    });
    this.saved.emit();
  }
}
