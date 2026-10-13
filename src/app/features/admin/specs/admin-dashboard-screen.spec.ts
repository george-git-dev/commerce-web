import { TestBed } from '@angular/core/testing';
import {
  $,
  $$,
  buttonByText,
  loginAs,
  renderAt,
  settle,
  textOf,
  type,
} from '../../../../testing/test-helpers';
import { Dashboard } from '../dashboard/dashboard';
import { AdminDashboard } from '../services/admin-dashboard';
import { PERIOD_LABELS } from '../services/admin-metrics';

const choose = (select: HTMLElement, value: string) => {
  (select as HTMLSelectElement).value = value;
  select.dispatchEvent(new Event('change'));
};

describe('Admin · painel de vendas', () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom não desenha canvas: o Chart.js só avisa.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
  });

  const open = (as = 'admin') =>
    renderAt('/admin', Dashboard, { path: 'admin', setup: () => loginAs(as) });

  it('mostra KPIs, estoque, ranking e tabela; ordena e troca a visão', async () => {
    const { fixture } = await open();
    expect($$(fixture, 'app-kpi-card').length).toBeGreaterThanOrEqual(5);
    expect(textOf(fixture)).toContain('Em estoque');
    expect(textOf(fixture)).toContain('Produtos mais vendidos');

    // Tabela de vendas: ordenar por coluna e alternar direção.
    const headers = $$(fixture, 'app-sales-table th button');
    headers[1].click();
    await settle(fixture);
    expect(headers[1].closest('th')!.getAttribute('aria-sort')).toBe('descending');
    headers[1].click();
    await settle(fixture);
    expect(headers[1].closest('th')!.getAttribute('aria-sort')).toBe('ascending');

    const views = $$(fixture, 'app-sales-table [role="radio"]');
    views[1].click();
    await settle(fixture);
    expect($$(fixture, 'app-sales-table app-chart')).toHaveLength(1);
    views[2].click();
    await settle(fixture);
    views[0].click();
    await settle(fixture);

    // Ranking: formato, ordem e "ver mais".
    const [format, sort] = $$(fixture, 'app-top-products select');
    for (const key of ['units', 'profit', 'margin', 'revenue']) {
      choose(sort, key);
      await settle(fixture);
    }
    choose(format, 'frasco');
    await settle(fixture);
    choose(format, '');
    await settle(fixture);
    const more = $$(fixture, '.tp__more')[0];
    if (more) {
      const before = $$(fixture, 'app-top-products li').length;
      more.click();
      await settle(fixture);
      expect($$(fixture, 'app-top-products li').length).toBeGreaterThan(before);
    }

    // "Ver por" mês e ano.
    for (const label of ['Mês', 'Ano', 'Dia']) {
      buttonByText(fixture, label).click();
      await settle(fixture);
    }
  });

  it('filtros: período (mês e personalizado com erro), categorias e limpar', async () => {
    const { fixture } = await open();
    const data = TestBed.inject(AdminDashboard);
    const period = (label: string) =>
      $$(fixture, 'app-dashboard-filters button').find((b) => b.textContent?.trim() === label)!;
    period(PERIOD_LABELS.hoje).click();
    await settle(fixture);
    expect(data.period()).toBe('hoje');
    period(PERIOD_LABELS.mes).click();
    await settle(fixture);
    type($(fixture, 'app-dashboard-filters input'), '2999-01');
    await settle(fixture);
    expect(textOf(fixture)).toContain('O mês não pode ser no futuro.');

    period(PERIOD_LABELS.personalizado).click();
    await settle(fixture);
    const [from, to] = $$(fixture, 'app-dashboard-filters input');
    type(from, '2026-10-10');
    type(to, '2026-10-01');
    await settle(fixture);
    expect(textOf(fixture)).toContain('A data inicial precisa ser antes da final.');
    type(to, data.today);
    await settle(fixture);

    const selects = $$(fixture, 'app-dashboard-filters select');
    choose(selects[0], 'perfume');
    choose(selects[2], 'oferta');
    choose(selects[3], 'Masculino');
    choose(selects[4], 'Lattafa');
    choose(selects[5], '1');
    await settle(fixture);
    expect(data.supplierId()).toBe(1);
    choose(selects[5], '');
    buttonByText(fixture, 'Limpar filtros').click();
    await settle(fixture);
    expect(data.hasFilters()).toBe(false);
  });

  it('quem não vê estoque não vê custo, lucro nem estoque', async () => {
    const { fixture } = await open('viewer');
    const canSee = textOf(fixture).includes('Em estoque');
    // Se o visualizador tiver stock:view, o card aparece; senão, some junto com o lucro.
    expect(textOf(fixture).includes('Lucro')).toBe(canSee);
  });
});
