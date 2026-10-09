import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { freeShippingProblem, moneyLabel } from '../../../core/utils/storefront-rules';
import { NonNegative } from '../../../shared/input-mask/non-negative';
import { AdminStorefront } from '../services/admin-storefront';

/**
 * `/admin/configuracoes` — regras comerciais da loja. Por enquanto, o frete
 * grátis (valor usado no carrinho, no checkout e nos textos da loja).
 * Fase 2: `PUT /admin/settings`; o back usa o mesmo valor ao calcular o pedido.
 */
@Component({
  selector: 'app-admin-settings',
  imports: [MatButtonModule, MatIconModule, NonNegative, RouterLink],
  template: `
    <section class="vf">
      <header>
        <p class="st__eyebrow">Gestão da loja</p>
        <h2>Configurações da loja</h2>
      </header>

      <form class="vf__card" (submit)="$event.preventDefault(); save()" novalidate>
        <h3>Frete grátis</h3>
        <fieldset [disabled]="readOnly">
          <label>
            Frete econômico grátis em pedidos a partir de (R$)
            <input
              type="number"
              inputmode="decimal"
              appNonNegative
              min="1"
              step="0.01"
              [value]="value()"
              [attr.aria-invalid]="(tried() && !!problem()) || null"
              (input)="value.set($any($event.target).value)"
            />
            @if (tried() && problem(); as message) {
              <span class="vf__hint vf__danger" role="alert">{{ message }}</span>
            } @else {
              <span class="vf__hint">
                Vale no carrinho, no checkout e nos textos da loja (faixa, destaques, ajuda).
              </span>
            }
          </label>
          <label class="vf__check">
            <input
              type="checkbox"
              [checked]="notice()"
              (change)="notice.set($any($event.target).checked)"
            />
            Mostrar o aviso na faixa do topo
          </label>
        </fieldset>
        <p class="st__preview" aria-live="polite">
          Faixa:
          <strong>{{
            notice() ? 'Frete grátis acima de ' + preview() : 'sem aviso de frete'
          }}</strong>
          · <a routerLink="/admin/vitrine/avisos">outros avisos</a>
        </p>
        @if (!readOnly) {
          <div class="vf__actions">
            <button matButton="filled" type="submit" class="ui-cta">Salvar</button>
          </div>
        }
      </form>
    </section>
  `,
  styleUrls: ['../storefront/storefront-form.scss'],
  styles: `
    header {
      display: grid;
      gap: 4px;
    }

    .st__eyebrow {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--gold);
    }

    .st__preview {
      margin: 0;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      background: var(--muted);
      font-size: 0.8125rem;
      color: var(--earth);

      a {
        color: inherit;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettings {
  private readonly store = inject(AdminStorefront);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly readOnly = !inject(AuthService).can('settings:edit');

  private readonly current = this.store.content.settings();
  protected readonly value = signal<string>(String(this.current.freeShippingMin));
  protected readonly notice = signal(this.current.freeShippingNotice);
  protected readonly tried = signal(false);

  protected readonly problem = computed(() => freeShippingProblem(this.value()));
  protected readonly preview = computed(() =>
    this.problem() ? '—' : moneyLabel(Math.round(Number(this.value()) * 100) / 100),
  );

  protected save(): void {
    this.tried.set(true);
    if (this.problem()) return;
    this.store.saveSettings({
      freeShippingMin: Math.round(Number(this.value()) * 100) / 100,
      freeShippingNotice: this.notice(),
    });
    this.snackBar.open('Configurações salvas — a loja já usa o novo valor.', 'Fechar', {
      duration: 3000,
    });
  }
}
