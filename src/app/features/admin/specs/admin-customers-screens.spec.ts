import { TestBed } from '@angular/core/testing';
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
import { AccountDirectory } from '../../../core/services/account-directory';
import { AdminCustomerDetail } from '../customer-detail/admin-customer-detail';
import { AdminCustomers } from '../customers/admin-customers';
import { AdminCustomerStore } from '../services/admin-customer-store';

const inDialog = <T extends HTMLElement = HTMLElement>(selector: string) =>
  dialogEl()!.querySelector<T>(selector)!;
const choose = (select: HTMLSelectElement, value: string) => {
  select.value = value;
  select.dispatchEvent(new Event('change'));
};
const submitDialog = async () => {
  inDialog('form').dispatchEvent(new Event('submit'));
  await settleDialog();
};
const confirmDialog = async (label: string) => {
  await openDialog();
  dialogButton(label).click();
  await dialogClosed();
};

describe('Admin · lista de clientes', () => {
  beforeEach(() => localStorage.clear());

  it('busca, filtros (afiliados, equipe, sem compra…) e ordenação', async () => {
    const { fixture } = await renderAt('/admin/clientes', AdminCustomers, {
      setup: () => loginAs('admin'),
    });
    const cards = () => $$(fixture, 'a[href^="/admin/clientes/"]').length;
    const all = cards();
    expect(all).toBeGreaterThan(0);
    const [filter, sort] = $$(fixture, '.cl__selects select') as HTMLSelectElement[];

    for (const value of [
      'recentes',
      'sem-compra',
      'bloqueados',
      'em-maos',
      'equipe',
      'afiliados',
    ]) {
      choose(filter, value);
      await settle(fixture);
      expect(cards()).toBeLessThanOrEqual(all);
    }
    choose(filter, 'afiliados');
    await settle(fixture);
    expect(textOf(fixture)).toContain('Afiliado');
    choose(filter, 'equipe');
    await settle(fixture);
    expect(cards()).toBe(3);
    choose(filter, 'todos');

    for (const value of ['nome', 'pedidos', 'total', 'desde']) {
      choose(sort, value);
      await settle(fixture);
    }
    type($(fixture, 'input[type="search"]'), 'marina');
    await settle(fixture);
    expect(cards()).toBe(1);
  });
});

describe('Admin · ficha do cliente', () => {
  beforeEach(() => localStorage.clear());

  const open = async (email: string, as = 'admin') => {
    let id = 0;
    const result = await renderAt(() => `/admin/clientes/${id}`, AdminCustomerDetail, {
      path: 'admin/clientes/:id',
      setup: () => {
        loginAs(as);
        id =
          TestBed.inject(AdminCustomerStore)
            .customers()
            .find((c) => c.email === email)?.id ?? 0;
      },
    });
    return { ...result, id, directory: TestBed.inject(AccountDirectory) };
  };

  it('bloqueia (motivo obrigatório) e desbloqueia', async () => {
    const { fixture, directory } = await open('pedro.alves@email.com');
    buttonByText(fixture, 'Bloquear cliente').click();
    await openDialog();
    await submitDialog();
    expect(dialogEl()!.textContent).toContain('Explique o motivo');
    type(inDialog('input'), 'Tentativas de fraude');
    await submitDialog();
    await dialogClosed();
    await settle(fixture);
    expect(directory.blockOf('pedro.alves@email.com')?.reason).toBe('Tentativas de fraude');
    expect(textOf(fixture)).toContain('Tentativas de fraude');

    buttonByText(fixture, 'Desbloquear cliente').click();
    await confirmDialog('Desbloquear');
    await settle(fixture);
    expect(directory.blockOf('pedro.alves@email.com')).toBeUndefined();
  });

  it('libera e cancela a entrega em mãos', async () => {
    const { fixture, directory } = await open('marina.lopes@email.com');
    buttonByText(fixture, 'entrega em mãos').click();
    await confirmDialog('Liberar');
    await settle(fixture);
    expect(directory.canReceiveInHands('marina.lopes@email.com')).toBe(true);
    buttonByText(fixture, 'entrega em mãos').click();
    await confirmDialog('Cancelar liberação');
    expect(directory.canReceiveInHands('marina.lopes@email.com')).toBe(false);
  });

  it('senha: e-mail de redefinição e link (plano B) com WhatsApp', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { fixture } = await open('marina.lopes@email.com');
    buttonByText(fixture, /Enviar link/).click();
    await confirmDialog('Enviar');
    await settle(fixture);
    expect($$(fixture, '.cd__note[role="status"]')).toHaveLength(1);

    buttonByText(fixture, /Gerar link/).click();
    await openDialog();
    dialogButton('Já confirmei').click();
    await settleDialog();
    expect(inDialog<HTMLInputElement>('.rl__url').value).toContain('/redefinir-senha?token=');
    dialogButton('Copiar').click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    await settleDialog();
    expect(dialogEl()!.textContent).toContain('Copiado');
    if (dialogEl()!.querySelector('a[href^="https://wa.me/"]')) {
      expect(inDialog('a[href^="https://wa.me/"]').getAttribute('href')).toContain('text=');
    }
    dialogButton('Fechar').click();
    await dialogClosed();
  });

  it('conta Google não tem senha; e-mail que falha avisa', async () => {
    const google = await open('cliente.google@gmail.com');
    expect(textOf(google.fixture)).toContain('Continuar com Google');
    TestBed.resetTestingModule();
    const { fixture } = await open('vizinho@email.com');
    buttonByText(fixture, /Enviar link/).click();
    await confirmDialog('Enviar');
    await settle(fixture);
    expect($$(fixture, '.cd__note--bad')).toHaveLength(1);
  });

  it('super admin: dá, troca e tira acesso ao backoffice; desistir volta a escolha', async () => {
    const { fixture, directory } = await open('vizinho@email.com', 'superadmin');
    const roles = () => $$(fixture, '.cd__roles input') as HTMLInputElement[];
    roles()[1].click();
    await settle(fixture);
    buttonByText(fixture, 'Dar acesso').click();
    await openDialog();
    dialogButton('Voltar').click();
    await dialogClosed();
    await settle(fixture);
    expect(directory.staffRolesOf('vizinho@email.com')).toEqual([]);

    roles()[1].click();
    await settle(fixture);
    buttonByText(fixture, 'Dar acesso').click();
    await confirmDialog('Dar acesso');
    await settle(fixture);
    expect(directory.staffRolesOf('vizinho@email.com')).toEqual(['ROLE_VIEWER']);

    roles()[2].click();
    await settle(fixture);
    buttonByText(fixture, 'Trocar perfil').click();
    await confirmDialog('Trocar perfil');
    await settle(fixture);
    expect(directory.staffRolesOf('vizinho@email.com')).toEqual(['ROLE_ADMIN']);

    roles()[0].click();
    await settle(fixture);
    buttonByText(fixture, 'Tirar acesso').click();
    await confirmDialog('Tirar acesso');
    expect(directory.staffRolesOf('vizinho@email.com')).toEqual([]);
  });

  it('super admin exclui o cadastro (confere o e-mail) e a ficha fica anonimizada', async () => {
    const { fixture } = await open('vizinho@email.com', 'superadmin');
    buttonByText(fixture, 'Excluir cadastro').click();
    await openDialog();
    const [email, reason] = Array.from(dialogEl()!.querySelectorAll<HTMLInputElement>('input'));
    type(email, 'outro@email.com');
    await submitDialog();
    expect(dialogEl()!.textContent).toContain('O e-mail não confere.');
    type(email, 'VIZINHO@email.com');
    type(reason, 'Pedido do cliente pelo WhatsApp');
    await submitDialog();
    await dialogClosed();
    await settle(fixture);
    expect(textOf(fixture)).toContain('Sem dados pessoais (cadastro excluído).');
  });

  it('visualizador vê dados mascarados e sem ações; cliente inexistente', async () => {
    const { fixture } = await open('marina.lopes@email.com', 'viewer');
    expect($$(fixture, '.cd__actions button')).toHaveLength(0);
    expect(textOf(fixture)).toContain('***');
    TestBed.resetTestingModule();
    const missing = await open('ninguem@email.com');
    expect(textOf(missing.fixture)).toContain('Cliente não encontrado.');
  });

  it('conta da equipe e a própria conta não são bloqueadas', async () => {
    const staff = await open('viewer@email.com');
    expect(buttonByText.bind(null, staff.fixture, 'Bloquear cliente')).toThrow();
    TestBed.resetTestingModule();
    const self = await open('admin@email.com');
    expect(textOf(self.fixture)).toMatch(/própria conta|equipe/);
  });
});
