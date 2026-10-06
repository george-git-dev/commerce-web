import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Card de indicador: valor, variação contra o período anterior e mini gráfico. */
@Component({
  selector: 'app-kpi-card',
  imports: [MatIconModule],
  template: `
    <div class="kpi__head">
      <span>{{ label() }}</span>
      <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
    </div>
    <strong class="kpi__value">{{ value() }}</strong>
    @if (delta(); as change) {
      <span class="kpi__delta" [class.kpi__delta--down]="change < 0">
        <mat-icon aria-hidden="true">{{ change < 0 ? 'south_east' : 'north_east' }}</mat-icon>
        {{ change > 0 ? '+' : '' }}{{ change.toLocaleString('pt-BR') }}%
        <small>vs. período anterior</small>
      </span>
    } @else {
      <span class="kpi__delta kpi__delta--none">Sem base para comparar</span>
    }
    @if (path()) {
      <svg class="kpi__spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
        <path [attr.d]="path()" />
      </svg>
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

    .kpi__delta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px 4px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #2f6b45;

      mat-icon {
        width: 14px;
        height: 14px;
        font-size: 14px;
      }

      small {
        font-weight: 400;
        color: var(--muted-foreground);
      }

      &--down {
        color: var(--wine);
      }

      &--none {
        font-weight: 400;
        color: var(--muted-foreground);
      }
    }

    .kpi__spark {
      width: 100%;
      height: 24px;

      path {
        fill: none;
        stroke: #a67b41;
        stroke-width: 1.5;
        vector-effect: non-scaling-stroke;
        stroke-linejoin: round;
        stroke-linecap: round;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly icon = input.required<string>();
  readonly value = input.required<string>();
  /** Variação em %; `null` quando o período anterior não tem dados. */
  readonly delta = input<number | null>(null);
  readonly spark = input<readonly number[]>([]);

  /** Linha do mini gráfico, normalizada para a caixa 100 × 24. */
  protected readonly path = computed(() => {
    const values = this.spark();
    if (values.length < 2) return '';
    const max = Math.max(...values);
    const min = Math.min(...values);
    const span = max - min || 1;
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * 100;
        const y = 22 - ((value - min) / span) * 20;
        return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  });
}
