import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import {
  $,
  $$,
  buttonByText,
  currentUrl,
  dialogButton,
  dialogClosed,
  loginAs,
  openDialog,
  renderAt,
  settle,
  textOf,
  type,
} from '../../../../testing/test-helpers';
import { CouponService } from '../../../core/services/coupon-service';
import { PromotionService } from '../../../core/services/promotion-service';
import { AdminAuditPage } from '../audit/admin-audit-page';
import { AdminCouponForm } from '../coupon-form/admin-coupon-form';
import { AdminCouponsPage } from '../coupons/admin-coupons';
import { AdminPromotionForm } from '../promotion-form/admin-promotion-form';
import { AdminPromotionsPage } from '../promotions/admin-promotions';
import { AdminReports } from '../reports/admin-reports';
import { AdminAudit } from '../services/admin-audit';
import { ReportJobs } from '../services/report-jobs';

const choose = (select: HTMLElement, value: string) => {
  (select as HTMLSelectElement).value = value;
  select.dispatchEvent(new Event('change'));
};
const submit = async (f: ComponentFixture<unknown>) => {
  $(f, 'form').dispatchEvent(new Event('submit'));
  await settle(f);
};
const problems = (f: ComponentFixture<unknown>) => $$(f, '[role="alert"] li').length;

describe('Admin · promoções', () => {
  beforeEach(() => localStorage.clear());

  it('lista com filtros por situação', async () => {
    const { fixture } = await renderAt('/admin/promocoes', AdminPromotionsPage, {
      setup: () => loginAs('admin'),
    });
    const all = $$(fixture, '.pr__row').length;
    expect(all).toBeGreaterThan(0);
    for (const chip of $$(fixture, '[role="tab"]')) {
      chip.click();
      await settle(fixture);
      expect($$(fixture, '.pr__row').length).toBeLessThanOrEqual(all);
    }
  });

  it('nova por itens: busca, marca todos, prévia, abaixo do custo e salva', async () => {
    const { fixture: f } = await renderAt('/admin/promocoes/nova', AdminPromotionForm, {
      extraRoutes: [{ path: 'admin/promocoes/:id', component: AdminPromotionForm }],
      setup: () => loginAs('admin'),
    });
    await submit(f);
    expect(problems(f)).toBeGreaterThan(0);

    type($(f, 'input[placeholder="Ex.: Liquidação decants 5 ml"]'), 'Khamrah 90%');
    type($(f, 'input[placeholder="Ex.: Khamrah"]'), 'khamrah');
    await settle(f);
    buttonByText(f, /^Selecionar os \d+ da lista/).click();
    await settle(f);
    buttonByText(f, 'Ver só os escolhidos').click();
    await settle(f);
    buttonByText(f, 'Ver todos').click();
    await settle(f);
    const value = $(f, 'input[inputmode="decimal"]');
    type(value, '90');
    await settle(f);
    expect(textOf(f)).toContain('abaixo do custo');
    await submit(f);
    expect(textOf(f)).toContain('confirme na prévia');
    ($(f, '.pf__confirm input') as HTMLInputElement).click();

    // Limites: unidades acima do estoque avisa; até acabar o estoque.
    const limits = $$(f, 'input[name="limit"]') as HTMLInputElement[];
    limits[2].click();
    await settle(f);
    type($(f, 'input[placeholder^="Ex.: 50"]'), '99999');
    await settle(f);
    limits[1].click();
    await settle(f);
    await submit(f);

    const created = TestBed.inject(PromotionService)
      .all()
      .find((p) => p.name === 'Khamrah 90%')!;
    expect(created).toMatchObject({ untilSoldOut: true });
    expect(currentUrl()).toBe(`/admin/promocoes/${created.id}`);
  });

  it('por categoria, marca e formato; editar e excluir', async () => {
    let id = 0;
    const { fixture: f } = await renderAt(() => `/admin/promocoes/${id}`, AdminPromotionForm, {
      path: 'admin/promocoes/:id',
      setup: () => {
        loginAs('admin');
        id = TestBed.inject(PromotionService).save(null, {
          name: 'Teste edição',
          active: true,
          target: { kind: 'marca', brand: 'Lattafa' },
          discount: { kind: 'percent', value: 5 },
          unitLimit: 10,
        });
      },
    });
    const kinds = () => $$(f, 'input[name="target"]') as HTMLInputElement[];
    kinds()[1].click();
    await settle(f);
    choose($(f, '.vf__card select'), 'perfume');
    kinds()[3].click();
    await settle(f);
    choose($$(f, '.vf__card select')[0], 'decant');
    kinds()[2].click();
    await settle(f);
    choose($$(f, '.vf__card select')[0], 'Armaf');
    choose($$(f, '.vf__card select')[1], 'amount');
    type($(f, 'input[inputmode="decimal"]'), '2');
    await submit(f);
    expect(
      TestBed.inject(PromotionService)
        .all()
        .find((p) => p.id === id),
    ).toMatchObject({
      target: { kind: 'marca', brand: 'Armaf' },
      discount: { kind: 'amount', value: 2 },
    });

    buttonByText(f, 'Excluir').click();
    await openDialog();
    dialogButton('Excluir').click();
    await dialogClosed();
    await settle(f);
    expect(
      TestBed.inject(PromotionService)
        .all()
        .some((p) => p.id === id),
    ).toBe(false);
    expect(currentUrl()).toBe('/admin/promocoes');
  });

  it('promoção inexistente e visualizador sem salvar', async () => {
    const { fixture } = await renderAt('/admin/promocoes/99999', AdminPromotionForm, {
      path: 'admin/promocoes/:id',
      setup: () => loginAs('viewer'),
    });
    expect(() => buttonByText(fixture, 'Salvar promoção')).toThrow();
  });
});

describe('Admin · cupons', () => {
  beforeEach(() => localStorage.clear());

  it('lista: busca pelo código e filtros', async () => {
    const { fixture } = await renderAt('/admin/promocoes/cupons', AdminCouponsPage, {
      setup: () => loginAs('admin'),
    });
    for (const chip of $$(fixture, '[role="tab"]')) {
      chip.click();
      await settle(fixture);
    }
    $$(fixture, '[role="tab"]')[0].click();
    type($(fixture, 'input'), 'nani');
    await settle(fixture);
    expect($$(fixture, '.pr__row')).toHaveLength(1);
  });

  it('novo cupom: valida, troca o tipo (frete grátis esconde valor) e salva', async () => {
    const { fixture: f } = await renderAt('/admin/promocoes/cupons/novo', AdminCouponForm, {
      extraRoutes: [{ path: 'admin/promocoes/cupons/:id', component: AdminCouponForm }],
      setup: () => loginAs('admin'),
    });
    await submit(f);
    expect(problems(f)).toBeGreaterThan(0);
    type($(f, 'input[placeholder="Ex.: NANI10"]'), 'natal25');
    const kinds = $$(f, 'input[name="kind"]') as HTMLInputElement[];
    kinds[2].click();
    await settle(f);
    expect($$(f, 'input[placeholder="Ex.: 50"]')).toHaveLength(0);
    kinds[1].click();
    await settle(f);
    kinds[0].click();
    await settle(f);
    type($(f, 'input[inputmode="decimal"]'), '25');
    type($(f, 'input[placeholder="Ex.: 50"]'), '80');
    type($(f, 'input[placeholder^="Ex.: 200"]'), '300');
    for (const box of $$(f, '.vf__check input')) (box as HTMLInputElement).click();
    type($(f, 'input[placeholder="Ex.: 100"]'), '50');
    type($(f, 'input[placeholder="Sem limite"]'), '');
    await submit(f);
    const coupon = TestBed.inject(CouponService).find('NATAL25')!;
    expect(coupon).toMatchObject({ value: 25, maxDiscount: 80, minSubtotal: 300, maxUses: 50 });
    expect(currentUrl()).toBe(`/admin/promocoes/cupons/${coupon.id}`);
  });

  it('cupom usado trava código e exclusão; sem uso pode excluir', async () => {
    const coupons = () => TestBed.inject(CouponService);
    const used = await renderAt('/admin/promocoes/cupons/1', AdminCouponForm, {
      path: 'admin/promocoes/cupons/:id',
      setup: () => loginAs('admin'),
    });
    expect(() => buttonByText(used.fixture, 'Excluir')).toThrow();
    TestBed.resetTestingModule();

    let id = 0;
    const { fixture } = await renderAt(() => `/admin/promocoes/cupons/${id}`, AdminCouponForm, {
      path: 'admin/promocoes/cupons/:id',
      setup: () => {
        loginAs('admin');
        id = coupons()
          .all()
          .find((c) => c.uses === 0 && !c.affiliateEmail)!.id;
      },
    });
    buttonByText(fixture, 'Excluir').click();
    await openDialog();
    dialogButton('Excluir').click();
    await dialogClosed();
    await settle(fixture);
    expect(
      coupons()
        .all()
        .some((c) => c.id === id),
    ).toBe(false);
    expect(currentUrl()).toBe('/admin/promocoes/cupons');
  });
});

describe('Admin · relatórios', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    URL.createObjectURL = vi.fn(() => 'blob:csv');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.useRealTimers());

  it('pede (com período personalizado validado), fica pronto e baixa', async () => {
    const { fixture: f } = await renderAt('/admin/relatorios', AdminReports, {
      setup: () => loginAs('admin'),
    });
    const selects = () => $$(f, '.rp__form select');
    choose(selects()[0], 'compras');
    await settle(f);
    choose(selects()[2], 'nota');
    choose(selects()[1], 'personalizado');
    await settle(f);
    const [from, to] = $$(f, '.rp__form input') as HTMLInputElement[];
    from.value = '2026-10-10';
    from.dispatchEvent(new Event('change'));
    to.value = '2026-10-01';
    to.dispatchEvent(new Event('change'));
    await settle(f);
    await submit(f);
    expect(TestBed.inject(ReportJobs).mine()).toHaveLength(0);
    to.value = '2026-10-11';
    to.dispatchEvent(new Event('change'));
    await submit(f);
    expect(TestBed.inject(ReportJobs).mine()).toHaveLength(1);

    choose(selects()[0], 'estoque');
    await settle(f);
    await submit(f);
    await submit(f);
    await submit(f);
    expect(textOf(f)).toContain('Espere um terminar');

    await vi.advanceTimersByTimeAsync(6_000);
    await settle(f);
    buttonByText(f, 'Baixar').click();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});

describe('Admin · auditoria', () => {
  beforeEach(() => {
    localStorage.clear();
    URL.createObjectURL = vi.fn(() => 'blob:csv');
    URL.revokeObjectURL = vi.fn();
  });

  it('filtra, ordena, abre o detalhe e exporta (exportação também é auditada)', async () => {
    const { fixture: f } = await renderAt('/admin/auditoria', AdminAuditPage, {
      setup: () => loginAs('superadmin'),
    });
    const rows = () => $$(f, '.au__row').length;
    expect(rows()).toBeGreaterThan(0);

    for (const button of $$(f, 'th button')) {
      button.click();
      await settle(f);
      button.click();
      await settle(f);
    }
    $$(f, '.au__row')[0].click();
    await settle(f);
    expect($$(f, '.au__row--open')).toHaveLength(1);
    $$(f, '.au__row')[0].click();
    await settle(f);

    const [period, area, by] = $$(f, 'select');
    choose(period, 'tudo');
    choose(area, 'pedidos');
    await settle(f);
    choose(area, 'todas');
    choose(by, ($$(f, 'select')[2].querySelectorAll('option')[1] as HTMLOptionElement).value);
    await settle(f);
    choose(by, 'todos');
    type($(f, 'input[type="search"], input'), 'zzz-nada');
    await settle(f);
    expect(rows()).toBe(0);
    type($(f, 'input[type="search"], input'), '');
    await settle(f);

    buttonByText(f, 'Exportar').click();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(TestBed.inject(AdminAudit).entries()[0].action).toBe('Exportou auditoria (CSV)');
  });

  it('só o super admin exporta', async () => {
    const { fixture } = await renderAt('/admin/auditoria', AdminAuditPage, {
      setup: () => loginAs('admin'),
    });
    expect($$(fixture, '.au__export')).toHaveLength(0);
  });
});
