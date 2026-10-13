import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FailureSimulator, SIMULATED_FAILURES } from '../../core/http/failure-simulator';
import { OnlineStatus } from '../../core/services/online-status';

/**
 * Faixa fixa no topo: "sem conexão" (navegador offline) e, só em
 * desenvolvimento, o aviso de que o simulador de falhas está ligado.
 */
@Component({
  selector: 'app-connection-banner',
  imports: [MatIconModule],
  template: `
    @if (!status.online()) {
      <p class="cb cb--offline" role="status">
        <mat-icon aria-hidden="true">wifi_off</mat-icon>
        Você está sem conexão. Algumas ações não vão funcionar até a internet voltar.
      </p>
    }
    @if (simulator.mode(); as mode) {
      <p class="cb cb--dev" role="status">
        <mat-icon aria-hidden="true">science</mat-icon>
        Simulando falha do back: {{ labels[mode] }}
        <button type="button" (click)="simulator.off()">Desligar</button>
      </p>
    }
  `,
  styles: `
    :host {
      position: sticky;
      top: 0;
      z-index: 1100;
      display: block;
    }

    .cb {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 0;
      padding: 8px 16px;
      font-size: 0.8125rem;
      font-weight: 600;
      text-align: center;

      mat-icon {
        flex: none;
        width: 18px;
        height: 18px;
        font-size: 18px;
      }
    }

    .cb--offline {
      background: var(--wine);
      color: #fff;
    }

    .cb--dev {
      background: #2b2b2b;
      color: #ffd88a;

      button {
        padding: 4px 10px;
        border: 1px solid currentColor;
        border-radius: 999px;
        background: none;
        color: inherit;
        font: inherit;
        cursor: pointer;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionBanner {
  protected readonly status = inject(OnlineStatus);
  protected readonly simulator = inject(FailureSimulator);
  protected readonly labels = SIMULATED_FAILURES;
}
