import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import {
  $,
  $$,
  buttonByText,
  dialogButton,
  dialogClosed,
  dialogEl,
  loginAs,
  openDialog,
  renderAt,
  settle,
  settleDialog,
  textOf,
  type,
} from '../../../../testing/test-helpers';
import { AffiliateProgram } from '../../../core/services/affiliate-program';
import { AffiliateService } from '../../../core/services/affiliate-service';
import { CouponService } from '../../../core/services/coupon-service';
import { AdminAffiliatePayouts } from '../affiliates/admin-affiliate-payouts';
import { AdminCommissions } from '../services/admin-commissions';

const inDialog = <T extends HTMLElement = HTMLElement>(selector: string) =>
  dialogEl()!.querySelector<T>(selector)!;
const allInDialog = <T extends HTMLElement = HTMLElement>(selector: string) =>
  Array.from(dialogEl()!.querySelectorAll<T>(selector));
const submitDialog = async () => {
  inDialog('form').dispatchEvent(new Event('submit'));
  await settleDialog();
};
const tab = async (f: ComponentFixture<unknown>, label: string) => {
  $$(f, '.afp__tabs [role="tab"]')
    .find((t) => t.textContent?.includes(label))!
    .click();
  await settle(f);
};
const byEmail = (email: string) =>
  TestBed.inject(AffiliateService)
    .all()
    .find((a) => a.email === email)!;

describe('Admin · afiliados', () => {
  beforeEach(() => {
    localStorage.clear();
    URL.createObjectURL = vi.fn(() => 'blob:recibo');
  });

  const open = (as = 'superadmin') =>
    renderAt('/admin/afiliados', AdminAffiliatePayouts, {
      setup: () => {
        loginAs(as);
        TestBed.inject(AffiliateProgram).today.set('2026-10-12');
        TestBed.inject(CouponService).today.set('2026-10-12');
      },
    });

  it('abre em Pedidos (há pendente): aprova com o cupom sugerido', async () => {
    const { fixture } = await open();
    expect($(fixture, '.afp__tabs [aria-selected="true"]').textContent).toContain('Pedidos');
    buttonByText(fixture, 'Aprovar').click();
    await openDialog();
    const input = inDialog<HTMLInputElement>('input');
    expect(input.value).toMatch(/^CARLA/);
    type(input, 'nani10');
    await submitDialog();
    expect(dialogEl()!.textContent).toContain('Já existe um cupom com este código.');
    type(input, 'carlavip');
    await submitDialog();
    await dialogClosed();
    await settle(fixture);
    expect(byEmail('carla.mendes@email.com')).toMatchObject({
      status: 'aprovado',
      couponCode: 'CARLAVIP',
    });

    // Aba Aprovados da lista de pedidos.
    $$(fixture, 'app-affiliate-requests button')
      .find((b) => b.textContent?.includes('Aprovados'))!
      .click();
    await settle(fixture);
    expect(textOf(fixture)).toContain('Ver cupons');
  });

  it('não aprovar exige motivo e aparece em "Não aprovados"', async () => {
    const { fixture } = await open();
    buttonByText(fixture, 'Não aprovar').click();
    await openDialog();
    type(inDialog('input'), 'curto');
    await submitDialog();
    type(inDialog('input'), 'Perfil sem conteúdo de perfumes');
    await submitDialog();
    await dialogClosed();
    await settle(fixture);
    expect(byEmail('carla.mendes@email.com').status).toBe('reprovado');
    $$(fixture, 'app-affiliate-requests button')
      .find((b) => b.textContent?.includes('Não aprovados'))!
      .click();
    await settle(fixture);
    expect(textOf(fixture)).toContain('Perfil sem conteúdo de perfumes');
  });

  it('aba Afiliados: busca, filtros, ordem e pagamento por Pix com comprovante', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { fixture } = await open();
    await tab(fixture, 'Afiliados');
    const cards = () => $$(fixture, 'app-coupon-ticket').length;
    expect(cards()).toBeGreaterThanOrEqual(3);
    for (const chip of $$(fixture, '.afp__chips [role="tab"]')) {
      chip.click();
      await settle(fixture);
    }
    $$(fixture, '.afp__chips [role="tab"]')[0].click();
    const sort = $(fixture, '.afp__sort select') as HTMLSelectElement;
    for (const value of ['a-pagar', 'nome', 'recentes', 'vendas']) {
      sort.value = value;
      sort.dispatchEvent(new Event('change'));
      await settle(fixture);
    }
    type($(fixture, 'input[type="search"]'), 'julia');
    await settle(fixture);
    expect(cards()).toBe(1);

    const julia = byEmail('julia.afiliada@email.com');
    const toPay = TestBed.inject(AdminCommissions).preview(julia);
    buttonByText(fixture, 'Fazer pagamento').click();
    await openDialog();
    allInDialog('button')
      .find((b) => b.textContent?.includes('Copiar'))!
      .click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(julia.pixKey));
    dialogButton('Concluir pagamento').click();
    await settleDialog();
    expect(dialogEl()!.querySelector('[role="alert"]')).not.toBeNull();
    const file = inDialog<HTMLInputElement>('input[type="file"]');
    Object.defineProperty(file, 'files', {
      value: [new File(['%PDF'], 'pix.pdf', { type: 'application/pdf' })],
    });
    file.dispatchEvent(new Event('change'));
    await settleDialog();
    expect(dialogEl()!.textContent).toContain('pix.pdf');
    dialogButton('Concluir pagamento').click();
    await dialogClosed();
    await settle(fixture);
    const made = TestBed.inject(AdminCommissions)
      .payouts()
      .find((p) => p.receipt?.name === 'pix.pdf');
    expect(made).toMatchObject({
      affiliateEmail: julia.email,
      amount: toPay.amount,
    });

    await tab(fixture, 'Pagamentos');
    expect($$(fixture, 'a[href="blob:recibo"]')).toHaveLength(1);
  });

  it('editar afiliado: código usado pede data do antigo e confirmação de margem', async () => {
    const { fixture } = await open();
    await tab(fixture, 'Afiliados');
    type($(fixture, 'input[type="search"]'), 'julia');
    await settle(fixture);
    buttonByText(fixture, 'Editar').click();
    await openDialog();
    const inputs = () => allInDialog<HTMLInputElement>('input');
    type(inputs()[0], '20');
    type(inputs()[1], '15');
    type(inputs()[2], 'julia15');
    await settleDialog();
    expect(dialogEl()!.textContent).toContain('vale até');
    await submitDialog();
    expect(dialogEl()!.textContent).toContain('Confirme o desconto + comissão acima de 30%.');
    const margin = allInDialog<HTMLInputElement>('input[type="checkbox"]').at(-1)!;
    margin.click();
    await settleDialog();
    await submitDialog();
    await dialogClosed();
    await settle(fixture);
    expect(byEmail('julia.afiliada@email.com')).toMatchObject({
      couponCode: 'JULIA15',
      commissionPercent: 20,
    });
    expect(TestBed.inject(CouponService).find('JULIA5')!.active).toBe(false);
  });

  it('comissões filtradas por situação e afiliado; configurações salvam o programa', async () => {
    const { fixture } = await open();
    await tab(fixture, 'Comissões');
    const before = $$(fixture, '.afp__list li').length;
    expect(before).toBeGreaterThan(0);
    for (const chip of $$(fixture, '.afp__chips [role="tab"]')) {
      chip.click();
      await settle(fixture);
    }
    const who = $(fixture, '.afp__filter select, select') as HTMLSelectElement;
    who.value = 'julia.afiliada@email.com';
    who.dispatchEvent(new Event('change'));
    $$(fixture, '.afp__chips [role="tab"]')[0].click();
    await settle(fixture);
    const items = $$(fixture, '.afp__list li');
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((li) => li.textContent?.includes('Júlia'))).toBe(true);

    await tab(fixture, 'Configurações');
    const active = $(fixture, 'app-program-settings input[type="checkbox"]') as HTMLInputElement;
    active.click();
    const numbers = $$(
      fixture,
      'app-program-settings input[inputmode], app-program-settings input[type="number"]',
    );
    type(numbers[numbers.length - 2], '-5');
    $(fixture, 'app-program-settings form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect($$(fixture, 'app-program-settings [role="alert"] li').length).toBeGreaterThan(0);
    type(numbers[numbers.length - 2], '80');
    $(fixture, 'app-program-settings form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(TestBed.inject(AffiliateProgram).live()).toBe(false);
    expect(textOf(fixture)).toContain('Configurações');
    // Aviso de programa pausado no topo leva às configurações.
    $(fixture, '.afp__link').click();
    await settle(fixture);
  });

  it('visualizador não aprova, não edita e não paga', async () => {
    const { fixture } = await open('viewer');
    expect(() => buttonByText(fixture, 'Aprovar')).toThrow();
    await tab(fixture, 'Afiliados');
    expect(() => buttonByText(fixture, 'Editar')).toThrow();
    expect(() => buttonByText(fixture, 'Fazer pagamento')).toThrow();
  });
});
