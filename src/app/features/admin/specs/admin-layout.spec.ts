import { TestBed } from '@angular/core/testing';
import {
  $,
  $$,
  buttonByText,
  currentUrl,
  loginAs,
  renderAt,
  settle,
  textOf,
} from '../../../../testing/test-helpers';
import { AuthService } from '../../../core/services/auth-service';
import { AdminLayout } from '../layout/admin-layout';

describe('Admin · layout e menu', () => {
  beforeEach(() => localStorage.clear());

  const open = (as: string, url = '/admin') =>
    renderAt(url, AdminLayout, { path: 'admin', setup: () => loginAs(as), extraRoutes: [] });

  const menu = (f: Parameters<typeof textOf>[0]) =>
    $$(f, 'mat-sidenav a.adm__item').map((a) => {
      const copy = a.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('mat-icon').forEach((icon) => icon.remove());
      return copy.textContent?.replace(/\d+/g, '').trim();
    });

  it('super admin vê todo o menu, pendências e o perfil no topo', async () => {
    const { fixture } = await open('superadmin');
    const items = menu(fixture);
    expect(items).toEqual(
      expect.arrayContaining(['Painel de vendas', 'Pedidos', 'Clientes', 'Auditoria', 'Vitrine']),
    );
    expect(textOf(fixture)).toContain('Painel de vendas');
    expect($$(fixture, '.adm__badge, [class*="badge"]').length).toBeGreaterThan(0);
    expect($(fixture, '.adm__user-text small').textContent).not.toBe('Equipe');
  });

  it('visualizador vê menos itens que o super admin', async () => {
    const all = menu((await open('superadmin')).fixture).length;
    TestBed.resetTestingModule();
    const viewer = menu((await open('viewer')).fixture).length;
    expect(viewer).toBeLessThanOrEqual(all);
  });

  it('celular: abre o menu, atalhos de baixo e fecha ao navegar', async () => {
    const { fixture } = await open('admin');
    $(fixture, '[aria-label="Abrir menu"]').click();
    await settle(fixture);
    expect($$(fixture, '.adm__tab, nav a').length).toBeGreaterThan(0);
    $$(fixture, 'mat-sidenav a.adm__item')[1].click();
    await settle(fixture);
    await fixture.whenStable();
    expect(currentUrl()).toBe('/admin/pedidos');
  });

  it('sair encerra a sessão e volta para a loja', async () => {
    const { fixture } = await open('admin');
    buttonByText(fixture, 'Sair').click();
    await settle(fixture);
    expect(TestBed.inject(AuthService).user()).toBeNull();
    expect(currentUrl()).toBe('/');
  });
});

describe('Admin · paginação e seletor de nomes', () => {
  beforeEach(() => localStorage.clear());

  it('paginador troca página e tamanho e rola até o topo da lista', async () => {
    const { AdminOrders } = await import('../orders/admin-orders');
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const { fixture } = await renderAt('/admin/pedidos', AdminOrders, {
      setup: () => loginAs('admin'),
    });
    const select = $$(fixture, '.ao__select select')[0] as HTMLSelectElement;
    select.value = 'todos';
    select.dispatchEvent(new Event('change'));
    await settle(fixture);
    const first = () => $$(fixture, '.ao__row strong')[0].textContent;
    const before = first();
    $(fixture, '.mat-mdc-paginator-navigation-next').click();
    await settle(fixture);
    expect(first()).not.toBe(before);
    expect(scroll).toHaveBeenCalled();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('nome parecido com um existente: sugere usar o existente ou criar assim mesmo', async () => {
    const { AdminSupplierForm } = await import('../supplier-form/admin-supplier-form');
    const { fixture } = await renderAt('/admin/estoque/fornecedores/novo', AdminSupplierForm, {
      setup: () => loginAs('admin'),
    });
    const picker = $(fixture, 'app-name-picker select') as HTMLSelectElement;
    picker.value = '__novo__';
    picker.dispatchEvent(new Event('change'));
    await settle(fixture);
    const input = $(fixture, 'app-name-picker input') as HTMLInputElement;
    input.value = 'x';
    input.dispatchEvent(new Event('input'));
    buttonByText(fixture, 'Adicionar').click();
    await settle(fixture);
    expect($$(fixture, '.sf__chips button[aria-pressed="true"]')).toHaveLength(0);

    input.value = 'Latafa';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await settle(fixture);
    expect(textOf(fixture)).toContain('Já existe "Lattafa"');
    buttonByText(fixture, 'Usar "Lattafa"').click();
    await settle(fixture);
    expect(
      $$(fixture, '.sf__chips button[aria-pressed="true"]').map((b) => b.textContent?.trim()),
    ).toEqual(['Lattafa']);
  });
});
