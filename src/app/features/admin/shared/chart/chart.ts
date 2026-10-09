import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

// Só o que o painel usa (o resto do Chart.js fica fora do bundle).
Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);
// Legenda só onde o gráfico pede (2+ séries); série única não precisa.
Chart.defaults.plugins.legend.display = false;
Chart.defaults.font.family = "'DM Sans', system-ui, sans-serif";
Chart.defaults.color = '#625950';

/**
 * Gráfico do Chart.js como componente: recebe a configuração pronta e recria o
 * gráfico quando ela muda. `label` descreve o gráfico para leitores de tela.
 */
@Component({
  selector: 'app-chart',
  template: `<canvas #canvas role="img" [attr.aria-label]="label()"></canvas>`,
  styles: `
    :host {
      position: relative;
      display: block;
      height: var(--chart-height, 240px);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCanvas {
  readonly config = input.required<ChartConfiguration>();
  readonly label = input.required<string>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  constructor() {
    // Só roda no navegador, depois de o canvas existir.
    afterRenderEffect(() => {
      const config = this.config();
      this.chart?.destroy();
      this.chart = new Chart(this.canvas().nativeElement, config);
    });
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }
}
