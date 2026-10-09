import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Card de indicador: valor do período e nota opcional (ex.: margem). */
@Component({
  selector: 'app-kpi-card',
  imports: [MatIconModule],
  template: `
    <div class="kpi__head">
      <span>{{ label() }}</span>
      <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
    </div>
    <strong class="kpi__value">{{ value() }}</strong>
    @if (note()) {
      <span class="kpi__note" [class.kpi__note--warn]="noteWarn()">{{ note() }}</span>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 6px;
      min-width: 0;
      padding: 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
    }

    .kpi__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 0.8125rem;
      color: var(--muted-foreground);

      mat-icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        font-size: 20px;
        color: var(--gold);
      }
    }

    .kpi__value {
      font-size: clamp(1rem, 0.75rem + 1.2vw, 1.625rem);
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    .kpi__note {
      font-size: 0.75rem;
      color: var(--muted-foreground);

      &--warn {
        color: var(--earth);
      }
    }

    // Compacto (indicadores secundários): 3 lado a lado no celular, sem ícone.
    :host(.kpi--compact) {
      padding: 12px;

      .kpi__head {
        font-size: 0.75rem;

        mat-icon {
          display: none;
        }
      }

      .kpi__value {
        font-size: 1.125rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly icon = input.required<string>();
  readonly value = input.required<string>();
  /** Linha abaixo do valor (ex.: "Margem de 34%"). */
  readonly note = input('');
  /** Destaca a nota (ex.: lucro parcial por falta de custo). */
  readonly noteWarn = input(false);
}
