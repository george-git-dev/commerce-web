import { TestBed } from '@angular/core/testing';
import {
  $,
  $$,
  buttonByText,
  currentUrl,
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
import { AdminOrder } from '../data/admin-orders-mock';
import { AdminOrders } from '../orders/admin-orders';
import { AdminOrderDetail } from '../order-detail/admin-order-detail';
import { AdminReturnsPage } from '../returns/admin-returns-page';
import { AdminOrderStore } from '../services/admin-order-store';
import { AdminReturns } from '../services/admin-returns';

/** Campo dentro do diálogo aberto. */
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

describe('Admin · lista de pedidos', () => {
  beforeEach(() => localStorage.clear());

  it('abas de status, busca, período e entrega filtram a lista', async () => {
    const { fixture } = await renderAt('/admin/pedidos', AdminOrders, {
      setup: () => loginAs('admin'),
    });
    const count = () => $$(fixture, '.ao__row').length;
    expect(count()).toBeGreaterThan(0);
    expect(textOf(fixture)).toContain('Devoluções');

    const select = $$(fixture, '.ao__select select') as HTMLSelectElement[];
    choose(select[0], 'todos');
    await settle(fixture);
    const total = Number($(fixture, '.ao__count').textContent!.match(/\d+/)![0]);

    const delivered = $$(fixture, '[role="tab"]').find((t) => t.textContent?.includes('Entregue'))!;
    delivered.click();
    await settle(fixture);
    expect(Number($(fixture, '.ao__count').textContent!.match(/\d+/)![0])).toBeLessThan(total);
    $$(fixture, '[role="tab"]')[0].click();

    choose(select[1], 'em-maos');
    await settle(fixture);
    expect($$(fixture, '.ao__pay mat-icon').length).toBe(count());
    choose(select[1], 'todos');

    const first = TestBed.inject(AdminOrderStore).orders()[0];
    type($(fixture, 'input[type="search"]'), first.number.toLowerCase());
    await settle(fixture);
    expect(count()).toBe(1);
    type($(fixture, 'input[type="search"]'), 'zzz-nada');
    await settle(fixture);
    expect(textOf(fixture)).toContain('Nenhum pedido com esses filtros.');
  });

  it('link do painel (?status=pago) escolhe a aba e limpa o endereço', async () => {
    const { fixture } = await renderAt('/admin/pedidos?status=pago', AdminOrders, {
      path: 'admin/pedidos',
      setup: () => loginAs('admin'),
    });
    await settle(fixture);
    const on = $(fixture, '[aria-selected="true"]');
    expect(on.textContent).toContain('Pagamento confirmado');
    expect(currentUrl()).toBe('/admin/pedidos');
  });
});

describe('Admin · detalhe do pedido', () => {
  beforeEach(() => localStorage.clear());

  const open = async (pick: (o: AdminOrder) => boolean, email = 'admin') => {
    let number = '';
    const result = await renderAt(() => `/admin/pedidos/${number}`, AdminOrderDetail, {
      path: 'admin/pedidos/:numero',
      setup: () => {
        loginAs(email);
        number = TestBed.inject(AdminOrderStore).orders().find(pick)?.number ?? 'NP000000';
      },
    });
    return { ...result, number, store: TestBed.inject(AdminOrderStore) };
  };

  it('pago → separação → pronto (com rastreio validado) → enviado', async () => {
    const { fixture, number, store } = await open(
      (o) => o.status === 'pago' && o.shipping !== 'em-maos',
    );
    const step = async (button: string) => {
      buttonByText(fixture, button).click();
      await openDialog();
    };

    await step('Iniciar separação');
    dialogButton('Confirmar').click();
    await dialogClosed();
    await settle(fixture);
    expect(store.find(number)!.status).toBe('em-separacao');

    await step('Pronto para envio');
    dialogButton('Confirmar').click();
    await dialogClosed();
    await settle(fixture);

    await step('Marcar como enviado');
    await submitDialog();
    expect(dialogEl()!.textContent).toContain('Use de 8 a 30 letras e números.');
    type(inDialog('input'), 'aa123456789br');
    await submitDialog();
    await dialogClosed();
    await settle(fixture);
    expect(store.find(number)).toMatchObject({ status: 'enviado', trackingCode: 'AA123456789BR' });
    expect(textOf(fixture)).toContain('AA123456789BR');
  });

  it('cancelar exige motivo; desistir não muda nada', async () => {
    const { fixture, number, store } = await open((o) => o.status === 'aguardando-pagamento');
    expect(textOf(fixture)).toContain('A confirmação do pagamento é automática');

    buttonByText(fixture, 'Cancelar pedido').click();
    await openDialog();
    dialogButton('Voltar').click();
    await dialogClosed();
    expect(store.find(number)!.status).toBe('aguardando-pagamento');

    buttonByText(fixture, 'Cancelar pedido').click();
    await openDialog();
    type(inDialog('input'), 'não');
    await submitDialog();
    expect(dialogEl()).not.toBeNull();
    type(inDialog('input'), 'Cliente desistiu da compra');
    await submitDialog();
    await dialogClosed();
    await settle(fixture);
    expect(store.find(number)!.status).toBe('cancelado');
    expect(textOf(fixture)).toContain('Cancelado: Cliente desistiu da compra');
  });

  it('entregue: registra devolução pelo diálogo (valida antes)', async () => {
    const { fixture, number } = await open(
      (o) => o.status === 'entregue' && !TestBed.inject(AdminReturns).ofOrder(o.number).length,
    );
    buttonByText(fixture, 'Registrar devolução').click();
    await openDialog();
    await submitDialog();
    expect(dialogEl()!.querySelectorAll('[role="alert"] li').length).toBeGreaterThan(0);

    choose(inDialog<HTMLSelectElement>('.rg__item select'), '1');
    choose(
      dialogEl()!.querySelectorAll<HTMLSelectElement>('select')[
        dialogEl()!.querySelectorAll('select').length - 1
      ],
      'defeito',
    );
    await settleDialog();
    type(inDialog('textarea'), 'Válvula não borrifa.');
    await submitDialog();
    await dialogClosed();
    await settle(fixture);
    expect(TestBed.inject(AdminReturns).ofOrder(number)[0].status).toBe('aprovada');
    expect(textOf(fixture)).toContain('Ver em Devoluções');
  });

  it('visualizador não vê ações; dados mascarados; imprimir e pedido inexistente', async () => {
    const print = vi.fn();
    window.print = print;
    const { fixture } = await open((o) => o.status === 'pago', 'viewer');
    expect($$(fixture, '.od__actions')).toHaveLength(0);
    expect($$(fixture, '.od__wa')).toHaveLength(0);
    buttonByText(fixture, 'Imprimir pedido').click();
    expect(print).toHaveBeenCalled();
    TestBed.resetTestingModule();
    const missing = await open(() => false);
    expect(textOf(missing.fixture)).toContain('Pedido não encontrado');
  });

  it('super admin vê WhatsApp e link da ficha do cliente', async () => {
    const { fixture } = await open((o) => !!o.customer.phone, 'superadmin');
    expect($(fixture, '.od__wa').getAttribute('href')).toMatch(/^https:\/\/wa\.me\/55\d+$/);
    expect($$(fixture, '.od__customer')).toHaveLength(1);
  });
});

describe('Admin · devoluções', () => {
  beforeEach(() => localStorage.clear());

  const open = (email = 'admin') =>
    renderAt('/admin/pedidos/devolucoes', AdminReturnsPage, { setup: () => loginAs(email) });

  it('aprova, conclui (estorno confirmado) e mostra nas concluídas', async () => {
    const { fixture } = await open();
    const store = TestBed.inject(AdminReturns);
    const request = store.all().find((r) => r.status === 'solicitada')!;
    expect(textOf(fixture)).toContain(`Pedido ${request.orderNumber}`);

    buttonByText(fixture, 'Aprovar').click();
    await openDialog();
    dialogButton('Aprovar').click();
    await dialogClosed();
    await settle(fixture);
    expect(store.all().find((r) => r.id === request.id)!.status).toBe('aprovada');

    $$(fixture, '[role="tab"]')[1].click();
    await settle(fixture);
    buttonByText(fixture, 'Produto recebido').click();
    await openDialog();
    await submitDialog();
    expect(dialogEl()!.textContent).toContain('Confirme o estorno');
    choose(inDialog<HTMLSelectElement>('select'), '1');
    inDialog<HTMLInputElement>('input[type="checkbox"]').click();
    type(inDialog('textarea'), 'Chegou lacrado');
    await submitDialog();
    await dialogClosed();
    await settle(fixture);
    expect(store.all().find((r) => r.id === request.id)!.status).toBe('concluida');

    $$(fixture, '[role="tab"]')[2].click();
    await settle(fixture);
    expect(textOf(fixture)).toContain('1 voltou ao estoque');
    expect(textOf(fixture)).toContain('Chegou lacrado');
  });

  it('recusa com motivo e recusa após avaliação', async () => {
    const { fixture } = await open();
    const store = TestBed.inject(AdminReturns);
    const request = store.all().find((r) => r.status === 'solicitada')!;
    buttonByText(fixture, 'Recusar').click();
    await openDialog();
    type(inDialog('input'), 'Fora do prazo de 30 dias');
    await submitDialog();
    await dialogClosed();
    await settle(fixture);
    expect(store.all().find((r) => r.id === request.id)!.status).toBe('recusada');

    // Registrada pela loja já nasce aprovada.
    const orders = TestBed.inject(AdminOrderStore).orders();
    const delivered = orders.find(
      (o) => o.status === 'entregue' && !store.ofOrder(o.number).length,
    )!;
    store.register(
      delivered,
      [{ itemId: `${delivered.number}-1`, quantity: 1 }],
      'defeito',
      'Válvula travada',
    );
    $$(fixture, '[role="tab"]')[1].click();
    await settle(fixture);
    buttonByText(fixture, 'Recusar após avaliação').click();
    await openDialog();
    type(inDialog('input'), 'Frasco aberto e usado');
    await submitDialog();
    await dialogClosed();
    $$(fixture, '[role="tab"]')[3].click();
    await settle(fixture);
    expect(textOf(fixture)).toContain('Recusada após avaliar o produto');
    $$(fixture, '[role="tab"]')[4].click();
    await settle(fixture);
    expect($$(fixture, '.rt__card').length).toBeGreaterThanOrEqual(2);
  });

  it('visualizador só vê (sem botões) e e-mail mascarado', async () => {
    const { fixture } = await open('viewer');
    expect($$(fixture, '.rt__actions')).toHaveLength(0);
    expect(textOf(fixture)).not.toContain('ana@email.com');
    $$(fixture, '[role="tab"]')[2].click();
    await settle(fixture);
    expect(textOf(fixture)).toContain('Nenhuma devolução aqui.');
  });
});
