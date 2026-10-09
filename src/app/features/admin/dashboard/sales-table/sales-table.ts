import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Chart, ChartConfiguration, Plugin } from 'chart.js';
import { SalesRow, totalRow } from '../../services/admin-metrics';
import { ChartCanvas } from '../../shared/chart/chart';

type View = 'tabela' | 'linha' | 'barras';
type Column = keyof SalesRow;

/**
 * As duas séries do gráfico, validadas juntas (daltonismo e visão normal):
 * faturamento em dourado, unidades vendidas em azul.
 */
const REVENUE = '#a9741f';
const UNITS = '#2a78d6';
const SURFACE = '#fffdfb';
const GRID = '#ece5db';
const INK = '#17130e';
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlShort = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Rótulo curto de dinheiro: "R$ 865", "R$ 1,2 mil". */
const money = (value: number) =>
  value < 1000 ? `R$ ${Math.round(value).toLocaleString('pt-BR')}` : brlShort.format(value);

/**
 * Valor em cima de cada barra — só quando todos os números cabem no espaço de
 * cada dia (com muitos dias, o valor fica só no tooltip).
 */
const barValues: Plugin<'bar'> = {
  id: 'barValues',
  afterDatasetsDraw(chart: Chart<'bar'>) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = "600 11px 'DM Sans', system-ui, sans-serif";
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    // Espaço de cada barra: o do dia dividido pelas barras lado a lado.
    const visible = chart.data.datasets.filter((_, i) => !chart.getDatasetMeta(i).hidden).length;
    const slot =
      chart.scales['x'].width / Math.max(1, chart.data.labels?.length ?? 1) / Math.max(1, visible);
    const fits = (texts: string[]) =>
      Math.max(0, ...texts.map((text) => ctx.measureText(text).width)) + 4 <= slot;
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;
      const values = dataset.data.map((raw) => Number(raw ?? 0));
      let texts = values.map((value) =>
        !value ? '' : datasetIndex === 0 ? money(value) : value.toLocaleString('pt-BR'),
      );
      // Sem espaço para "R$ 865": tenta só o número; se ainda não couber, não escreve.
      if (!fits(texts)) texts = texts.map((text) => text.replace(/R\$\s*/, ''));
      if (!fits(texts)) return;
      meta.data.forEach((bar, index) => {
        if (texts[index]) ctx.fillText(texts[index], bar.x, bar.y - 3);
      });
    });
    ctx.restore();
  },
};

/**
 * Vendas do período como planilha (linhas por dia/mês/ano, colunas ordenáveis
 * e total) e, no mesmo dado, em linha ou barras com faturamento e unidades
 * vendidas — cada um no seu painel (escalas diferentes não dividem eixo).
 */
@Component({
  selector: 'app-sales-table',
  imports: [CurrencyPipe, ChartCanvas],
  templateUrl: './sales-table.html',
  styleUrl: './sales-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesTable {
  readonly rows = input.required<readonly SalesRow[]>();
  /** "dia", "mês" ou "ano" — rótulo da primeira coluna. */
  readonly unit = input.required<string>();

  protected readonly views: { id: View; label: string; icon: string }[] = [
    { id: 'tabela', label: 'Tabela', icon: 'table' },
    { id: 'linha', label: 'Linha', icon: 'line' },
    { id: 'barras', label: 'Barras', icon: 'bars' },
  ];
  protected readonly view = signal<View>('tabela');

  /** Ordenação: coluna e direção; `label` = ordem das datas (mais recente primeiro). */
  protected readonly sort = signal<{ column: Column; desc: boolean }>({
    column: 'label',
    desc: true,
  });

  protected readonly total = computed(() => totalRow(this.rows()));
  protected readonly sorted = computed(() => {
    const { column, desc } = this.sort();
    // Índice preserva a ordem cronológica (rótulos "dd/MM" não ordenam como texto).
    const indexed = this.rows().map((row, index) => ({ row, index }));
    indexed.sort((a, b) => {
      const diff =
        column === 'label'
          ? a.index - b.index
          : (a.row[column] as number) - (b.row[column] as number);
      return (desc ? -diff : diff) || b.index - a.index;
    });
    return indexed.map((item) => item.row);
  });

  protected sortBy(column: Column): void {
    const current = this.sort();
    this.sort.set({ column, desc: current.column === column ? !current.desc : true });
  }

  protected ariaSort(column: Column): 'ascending' | 'descending' | null {
    const { column: active, desc } = this.sort();
    return active === column ? (desc ? 'descending' : 'ascending') : null;
  }

  protected readonly caption = computed(
    () => `Faturamento (eixo da esquerda) e unidades vendidas (eixo da direita) por ${this.unit()}`,
  );

  protected readonly chart = computed<ChartConfiguration>(() => {
    const bars = this.view() === 'barras';
    const rows = this.rows();
    const series = (label: string, color: string, axis: string, key: 'revenue' | 'units') => ({
      label,
      data: rows.map((row) => row[key]),
      yAxisID: axis,
      borderColor: color,
      backgroundColor: color,
      hoverBackgroundColor: color,
      // Linha
      borderWidth: 2,
      fill: false,
      tension: 0.3,
      // Curva suave sem passar abaixo de zero entre os pontos.
      cubicInterpolationMode: 'monotone' as const,
      // Bolinha só onde teve venda (dia zerado fica só a linha no chão).
      pointRadius: rows.map((row) => (row[key] ? 5 : 0)),
      pointHoverRadius: 8,
      pointBackgroundColor: color,
      pointBorderColor: SURFACE,
      pointBorderWidth: 2,
      // Barras
      borderRadius: 4,
      maxBarThickness: 32,
    });
    /**
     * Linha e barras com dois eixos no mesmo gráfico: faturamento à esquerda,
     * unidades à direita, ambos a partir do zero (pedido do George, como no
     * exemplo do Chart.js). Nas barras, as duas ficam lado a lado em cada dia.
     */
    const axis = (title: string, money: boolean) => ({
      type: 'linear' as const,
      position: (money ? 'left' : 'right') as 'left' | 'right',
      beginAtZero: true,
      grace: bars ? '15%' : '5%',
      border: { display: false },
      // Só a grade do eixo da esquerda (duas grades confundem).
      grid: { color: GRID, drawOnChartArea: money },
      title: { display: true, text: title, color: INK, font: { weight: 600 } },
      ticks: {
        maxTicksLimit: 4,
        precision: money ? undefined : 0,
        callback: (value: string | number) =>
          money ? brlShort.format(Number(value)) : Number(value).toLocaleString('pt-BR'),
      },
    });
    return {
      type: bars ? 'bar' : 'line',
      data: {
        labels: rows.map((row) => row.label),
        datasets: [
          series('Faturamento', REVENUE, 'revenue', 'revenue'),
          series('Unidades vendidas', UNITS, 'units', 'units'),
        ],
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        // Entra crescendo; nas barras, uma depois da outra.
        animation: {
          duration: 700,
          easing: 'easeOutQuart',
          delay: (context) =>
            bars && context.type === 'data' && context.mode === 'default'
              ? context.dataIndex * 18
              : 0,
        },
        layout: { padding: { top: 6 } },
        plugins: {
          // Legenda em HTML, fora da área que rola (fica sempre à vista).
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) =>
                item.datasetIndex === 0
                  ? ` Faturamento: ${brl.format(item.parsed.y ?? 0)}`
                  : ` Unidades: ${(item.parsed.y ?? 0).toLocaleString('pt-BR')}`,
            },
          },
        },
        scales: {
          // Data embaixo só de dia/mês com venda (sem data solta); sem espaço, fica de pé.
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              minRotation: 0,
              maxRotation: 90,
              font: { size: 11 },
              callback: (_, index) => {
                const row = rows[index];
                return row && (row.revenue || row.units) ? row.label : '';
              },
            },
          },
          revenue: axis('Faturamento', true),
          units: axis('Unidades', false),
        },
      },
      plugins: bars ? [barValues as Plugin] : [],
    } as ChartConfiguration;
  });

  /**
   * Largura mínima do gráfico: cada dia/mês precisa de espaço para o rótulo
   * (e as barras lado a lado). Passou da tela, rola de lado.
   */
  protected readonly chartMinWidth = computed(() => this.rows().length * 16 + 110);

  /** Legenda (HTML): mesmas cores das séries. */
  protected readonly legend = [
    { label: 'Faturamento', color: REVENUE },
    { label: 'Unidades vendidas', color: UNITS },
  ];

  protected readonly chartLabel = computed(
    () => `Gráfico de ${this.view() === 'barras' ? 'barras' : 'linha'}: ${this.caption()}`,
  );
}
