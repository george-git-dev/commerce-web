import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { ORDER_STATUS_LABELS } from '../../../core/models/order';
import { AuthService } from '../../../core/services/auth-service';
import { AdminDashboard } from '../services/admin-dashboard';
import { Grouping, GROUPING_LABELS } from '../services/admin-metrics';
import { ChartCanvas } from '../shared/chart/chart';
import { KpiCard } from '../shared/kpi-card/kpi-card';
import { DashboardFilters } from './dashboard-filters/dashboard-filters';
import { SalesTable } from './sales-table/sales-table';
import { StockSummary } from './stock-summary/stock-summary';
import { TopProducts } from './top-products/top-products';

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

/**
 * `/admin` — painel de vendas. Responde, nesta ordem: quanto vendi, quanto
 * lucrei, como as vendas andaram, o que mais vende e como está o estoque.
 * Funil, origem das vendas e CAC ficam para depois do MVP (precisam de
 * rastreamento de eventos e gasto com anúncios).
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    CurrencyPipe,
    ChartCanvas,
    DashboardFilters,
    KpiCard,
    SalesTable,
    StockSummary,
    TopProducts,
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

  /** Custo, lucro e estoque vêm das compras: quem não vê estoque não vê isso. */
  protected readonly canSeeCost = this.auth.can('stock:view');

  protected readonly groupings = Object.entries(GROUPING_LABELS) as [Grouping, string][];
  /** Rótulo da 1ª coluna/legenda da tabela de vendas. */
  protected readonly unitLabels = { dia: 'dia', mes: 'mês', ano: 'ano' } as const;

  protected readonly brl = (value: number) => brl.format(value);
  protected readonly percent = (value: number) => `${value.toLocaleString('pt-BR')}%`;

  /** "Margem de 34,2%" + aviso quando há produto vendido sem custo. */
  protected readonly profitNote = computed(() => {
    const { margin, uncosted } = this.data.kpis().current.profit;
    const base = margin == null ? 'Sem custo registrado' : `Margem de ${this.percent(margin)}`;
    if (!uncosted || margin == null) return base;
    return `${base} · parcial: ${uncosted} ${uncosted === 1 ? 'item' : 'itens'} sem custo`;
  });

  /** "01/09 a 30/09" — janela do gráfico de vendas por dia. */
  protected readonly seriesLabel = computed(() => {
    const series = this.data.salesSeries();
    return `${series[0]?.label} a ${series.at(-1)?.label}`;
  });

  /** Maior valor da lista com barra (para a largura proporcional). */
  protected readonly statusMax = computed(() =>
    Math.max(1, ...this.data.statusCounts().map((s) => s.count)),
  );
  protected readonly statusTotal = computed(() =>
    this.data.statusCounts().reduce((sum, s) => sum + s.count, 0),
  );

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
