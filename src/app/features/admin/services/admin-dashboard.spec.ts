import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth-service';
import { AdminDashboard } from './admin-dashboard';

describe('AdminDashboard', () => {
  let dash: AdminDashboard;

  beforeEach(() => {
    localStorage.clear();
    TestBed.inject(AuthService).login('admin@email.com', '12345678');
    dash = TestBed.inject(AdminDashboard);
  });

  it('padrão: últimos 30 dias com KPIs, séries e resumo do estoque', () => {
    expect(dash.periodProblem()).toBeNull();
    expect(dash.range().days).toBe(30);
    const k = dash.kpis().current;
    expect(k.orders).toBeGreaterThan(0);
    expect(k.units).toBeGreaterThan(0);
    expect(dash.salesSeries().length).toBe(30);
    expect(dash.salesRows().length).toBeGreaterThan(0);
    expect(dash.productSales().length).toBeGreaterThan(0);
    const product = dash.productSales()[0];
    expect(product.brand).not.toBe('');
    const stock = dash.stockSummary();
    expect(stock.units).toBeGreaterThan(0);
    expect(stock.value).toBeGreaterThan(0);
    expect(dash.statusCounts()).toBeTruthy();
    expect(dash.salesByGroup()).toBeTruthy();
  });

  it('períodos: hoje, mês (inválido/futuro) e personalizado', () => {
    dash.period.set('hoje');
    expect(dash.range().days).toBe(1);
    expect(dash.salesSeries().length).toBe(7); // mínimo de 7 dias no gráfico

    dash.period.set('mes');
    expect(dash.periodProblem()).toBeNull();
    dash.month.set('');
    expect(dash.periodProblem()).toBe('Escolha o mês.');
    expect(dash.range().days).toBe(30); // cai nos 30 dias até corrigir
    dash.month.set('2999-01');
    expect(dash.periodProblem()).toBe('O mês não pode ser no futuro.');

    dash.period.set('personalizado');
    expect(dash.periodProblem()).toBeNull();
    dash.customFrom.set(dash.today);
    dash.customTo.set(dash.today);
    expect(dash.range().days).toBe(1);
    dash.customTo.set('2999-01-01');
    expect(dash.periodProblem()).toMatch(/futuro/);

    dash.period.set('7d');
    expect(dash.range().days).toBe(7);
  });

  it('agrupar por mês e ano', () => {
    dash.grouping.set('mes');
    expect(dash.salesSeries().length).toBeGreaterThan(0);
    dash.grouping.set('ano');
    expect(dash.salesRows().length).toBeGreaterThan(0);
  });

  it('filtros reduzem os números e limpam tudo', () => {
    const all = dash.kpis().current.orders;
    expect(dash.formatOptions().map((o) => o.id)).toContain('frasco');
    expect(dash.highlightOptions().map((o) => o.id)).toEqual(
      expect.arrayContaining(['lancamento', 'oferta', 'mais-vendido']),
    );

    for (const [set, value] of [
      [dash.category, 'kit'],
      [dash.gender, 'Feminino'],
      [dash.brand, 'Lattafa'],
      [dash.format, 'decant'],
    ] as const) {
      (set as { set(v: string): void }).set(value);
      expect(dash.hasFilters()).toBe(true);
      expect(dash.kpis().current.orders).toBeLessThanOrEqual(all);
      dash.clearFilters();
    }

    for (const highlight of ['lancamento', 'oferta', 'mais-vendido', 'selo:Exclusivo']) {
      dash.highlight.set(highlight);
      expect(dash.kpis().current.orders).toBeLessThanOrEqual(all);
    }
    dash.clearFilters();

    dash.supplierId.set(1);
    expect(dash.kpis().current.orders).toBeLessThanOrEqual(all);
    dash.clearFilters();
    expect(dash.hasFilters()).toBe(false);
    expect(dash.kpis().current.orders).toBe(all);
  });
});
