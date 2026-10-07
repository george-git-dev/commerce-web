import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { ORDER_STATUS_LABELS } from '../../../core/models/order';
import { AuthService } from '../../../core/services/auth-service';
import { AdminDashboard } from '../services/admin-dashboard';
import { ChartCanvas } from '../shared/chart/chart';
import { KpiCard } from '../shared/kpi-card/kpi-card';
import { DashboardFilters } from './dashboard-filters/dashboard-filters';
import { LatestOrders } from './latest-orders/latest-orders';

/** Dourado dos gráficos: um tom abaixo do da marca, para ter contraste ≥ 3:1 no card. */
const CHART_GOLD = '#a67b41';
const GRID = '#ece5db';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlShort = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** `/admin` — visão geral: indicadores, gráficos e últimos pedidos, com período e filtros. */
@Component({
  selector: 'app-dashboard',
  imports: [
    CurrencyPipe,
    MatIconModule,
    RouterLink,
    ChartCanvas,
    DashboardFilters,
    KpiCard,
    LatestOrders,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly data = inject(AdminDashboard);
  protected readonly auth = inject(AuthService);

  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');

  protected readonly brl = (value: number) => brl.format(value);

  /** "01/09 a 30/09" — janela do gráfico de vendas por dia. */
  protected readonly seriesLabel = computed(() => {
    const series = this.data.salesSeries();
    return `${series[0]?.label} a ${series.at(-1)?.label}`;
  });

  /** Maior valor das listas com barra (para a largura proporcional). */
  protected readonly topMax = computed(() =>
    Math.max(1, ...this.data.topProducts().map((p) => p.units)),
  );
  protected readonly statusMax = computed(() =>
    Math.max(1, ...this.data.statusCounts().map((s) => s.count)),
  );
  protected readonly statusTotal = computed(() =>
    this.data.statusCounts().reduce((sum, s) => sum + s.count, 0),
  );

  protected readonly salesChart = computed<ChartConfiguration>(() => {
    const series = this.data.salesSeries();
    return {
      type: 'line',
      data: {
        labels: series.map((point) => point.label),
        datasets: [
          {
            label: 'Vendas',
            data: series.map((point) => point.value),
            borderColor: CHART_GOLD,
            backgroundColor: 'rgba(166, 123, 65, 0.1)',
            borderWidth: 2,
            fill: true,
            // Monótona: a curva não "passa" abaixo de zero entre dias sem venda.
            cubicInterpolationMode: 'monotone',
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: CHART_GOLD,
            pointHoverBorderColor: '#fffdfb',
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          tooltip: { callbacks: { label: (item) => ` ${brl.format(item.parsed.y ?? 0)}` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 6, maxRotation: 0 } },
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: GRID },
            ticks: { maxTicksLimit: 5, callback: (value) => brlShort.format(Number(value)) },
          },
        },
      },
    };
  });

  protected readonly groupChart = computed<ChartConfiguration>(() => {
    const groups = this.data.salesByGroup();
    return {
      type: 'bar',
      data: {
        labels: groups.map((group) => group.group),
        datasets: [
          {
            label: 'Vendas',
            data: groups.map((group) => group.value),
            backgroundColor: CHART_GOLD,
            hoverBackgroundColor: '#8f6833',
            borderRadius: { topRight: 4, bottomRight: 4 },
            borderSkipped: 'left',
            maxBarThickness: 24,
          },
        ],
      },
      // Barras deitadas: os nomes das categorias cabem inteiros até no celular.
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        plugins: {
          tooltip: { callbacks: { label: (item) => ` ${brl.format(item.parsed.x ?? 0)}` } },
        },
        scales: {
          y: { grid: { display: false }, border: { display: false } },
          x: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: GRID },
            ticks: { maxTicksLimit: 4, callback: (value) => brlShort.format(Number(value)) },
          },
        },
      },
    };
  });
}
