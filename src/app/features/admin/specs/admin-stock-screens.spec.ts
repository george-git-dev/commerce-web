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
import { AdminEntries } from '../entries/admin-entries';
import { AdminEntryDetail } from '../entry-detail/admin-entry-detail';
import { AdminEntryForm } from '../entry-form/admin-entry-form';
import { AdminProductStore } from '../services/admin-product-store';
import { AdminPurchaseStore } from '../services/admin-purchase-store';
import { AdminStockStore } from '../services/admin-stock-store';
import { AdminStock } from '../stock/admin-stock';
import { AdminStockDetail } from '../stock-detail/admin-stock-detail';
import { AdminSupplierForm } from '../supplier-form/admin-supplier-form';
import { AdminSuppliers } from '../suppliers/admin-suppliers';

const NEW = '__novo__';
const VALID_CNPJ = '11.444.777/0001-61';
const inDialog = <T extends HTMLElement = HTMLElement>(selector: string) =>
  dialogEl()!.querySelector<T>(selector)!;
const allInDialog = <T extends HTMLElement = HTMLElement>(selector: string) =>
  Array.from(dialogEl()!.querySelectorAll<T>(selector));
const choose = (select: HTMLSelectElement, value: string) => {
  select.value = value;
  select.dispatchEvent(new Event('change'));
};
const submitDialog = async () => {
  inDialog('form').dispatchEvent(new Event('submit'));
  await settleDialog();
};

describe('Admin · saldo do estoque', () => {
  beforeEach(() => localStorage.clear());

  it('chips de resumo, filtros e busca', async () => {
    const { fixture } = await renderAt('/admin/estoque', AdminStock, {
      setup: () => loginAs('admin'),
    });
    const rows = () => $$(fixture, '.st__row').length;
    expect(rows()).toBeGreaterThan(0);
    expect(textOf(fixture)).toContain('Fornecedores');

    const [, low, zero] = $$(fixture, '.st__summary button');
    low.click();
    await settle(fixture);
    expect(low.getAttribute('aria-pressed')).toBe('true');
    low.click();
    await settle(fixture);
    expect(low.getAttribute('aria-pressed')).toBe('false');
    zero.click();
    await settle(fixture);
    $$(fixture, '.st__summary button')[0].click();

    const [status, kind, brand] = $$(fixture, '.st__filters select') as HTMLSelectElement[];
    choose(status, 'alerta');
    choose(kind, 'decant');
    choose(brand, 'Lattafa');
    await settle(fixture);
    choose(status, 'todas');
    choose(kind, 'todos');
    choose(brand, 'todas');
    type($(fixture, 'input[type="search"]'), 'lattafa-asad-100');
    await settle(fixture);
    expect(rows()).toBe(1);
  });

  it('link do painel (?situacao=alerta) aplica o filtro', async () => {
    const { fixture } = await renderAt('/admin/estoque?situacao=alerta', AdminStock, {
      path: 'admin/estoque',
      setup: () => loginAs('admin'),
    });
    expect(($(fixture, '.st__filters select') as HTMLSelectElement).value).toBe('alerta');
    expect(currentUrl()).toBe('/admin/estoque');
  });
});

describe('Admin · item do estoque', () => {
  beforeEach(() => localStorage.clear());

  const open = (sku = 'lattafa-asad-100', as = 'admin') =>
    renderAt(`/admin/estoque/${sku}`, AdminStockDetail, {
      path: 'admin/estoque/:sku',
      setup: () => loginAs(as),
    });

  it('ajusta o saldo pelo diálogo (valida, troca a direção) e salva o mínimo', async () => {
    const { fixture } = await open();
    const stock = TestBed.inject(AdminStockStore);
    const before = stock.row('lattafa-asad-100')!.variant.stock;
    expect(textOf(fixture)).toContain('NF');

    buttonByText(fixture, 'Ajustar').click();
    await openDialog();
    await submitDialog();
    expect(allInDialog('[role="alert"] li').length).toBeGreaterThan(0);

    allInDialog('button')
      .find((b) => b.textContent?.includes('Saída'))!
      .click();
    await settleDialog();
    allInDialog('button')
      .find((b) => b.textContent?.includes('Entrada'))!
      .click();
    await settleDialog();
    type(inDialog('input'), '4');
    choose(inDialog<HTMLSelectElement>('select'), 'Correção de inventário');
    type(inDialog('textarea'), 'contagem');
    await settleDialog();
    expect(dialogEl()!.textContent).toContain(String(before + 4));
    await submitDialog();
    await dialogClosed();
    await settle(fixture);
    expect(stock.row('lattafa-asad-100')!.variant.stock).toBe(before + 4);
    expect(textOf(fixture)).toContain('contagem');

    const min = $(fixture, '#min') as HTMLInputElement;
    type(min, '-1');
    await settle(fixture);
    expect(textOf(fixture)).toContain('Inteiro, zero ou mais.');
    type(min, '7');
    await settle(fixture);
    $(fixture, 'form.sd__card').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(stock.minimum('lattafa-asad-100')).toBe(7);
  });

  it('visualizador só lê; SKU inexistente avisa', async () => {
    const { fixture } = await open('lattafa-asad-100', 'viewer');
    expect($$(fixture, '#min')).toHaveLength(0);
    TestBed.resetTestingModule();
    const missing = await open('nao-existe');
    expect(textOf(missing.fixture)).toContain('Ver estoque');
  });
});

describe('Admin · entradas de mercadoria', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  it('lista filtra por situação, fornecedor e busca', async () => {
    const { fixture } = await renderAt('/admin/estoque/entradas', AdminEntries, {
      setup: () => loginAs('admin'),
    });
    const rows = () =>
      $$(fixture, 'a[href^="/admin/estoque/entradas/"]').filter(
        (a) => !a.textContent?.includes('Nova'),
      ).length;
    const all = rows();
    expect(all).toBe(4);
    const [status, supplier] = $$(fixture, 'select') as HTMLSelectElement[];
    choose(status, 'pedido');
    await settle(fixture);
    expect(rows()).toBe(1);
    choose(status, 'todas');
    choose(supplier, '2');
    await settle(fixture);
    expect(rows()).toBe(2);
    choose(supplier, 'todos');
    type($(fixture, 'input[type="search"]'), 'al waha');
    await settle(fixture);
    expect(rows()).toBe(1);
  });

  it('detalhe: marcar como recebido soma no estoque', async () => {
    const { fixture } = await renderAt('/admin/estoque/entradas/4', AdminEntryDetail, {
      path: 'admin/estoque/entradas/:id',
      setup: () => loginAs('admin'),
    });
    const store = TestBed.inject(AdminPurchaseStore);
    buttonByText(fixture, 'Marcar como recebido').click();
    await openDialog();
    dialogButton('Receber').click();
    await dialogClosed();
    await settle(fixture);
    expect(store.entry(4)!.status).toBe('recebido');
    expect($$(fixture, 'button').some((b) => b.textContent?.includes('Marcar como recebido'))).toBe(
      false,
    );
  });

  it('nova entrada: valida, cria fornecedor e produto pelos diálogos e recebe', async () => {
    const { fixture } = await renderAt('/admin/estoque/entradas/nova', AdminEntryForm, {
      setup: () => loginAs('admin'),
    });
    const store = TestBed.inject(AdminPurchaseStore);
    buttonByText(fixture, 'Receber agora').click();
    await settle(fixture);
    expect($$(fixture, '.ef__problems li').length).toBeGreaterThan(0);

    // Fornecedor novo (diálogo).
    const supplierSelect = $(fixture, '.ef__card select') as HTMLSelectElement;
    choose(supplierSelect, NEW);
    await openDialog();
    await submitDialog();
    expect(allInDialog('[role="alert"] li').length).toBeGreaterThan(0);
    const [legal, , cnpj, whats] = allInDialog<HTMLInputElement>('input');
    type(legal, 'Perfumes Novos Ltda');
    type(cnpj, '11444777000161');
    type(whats, '11988887777');
    await submitDialog();
    await dialogClosed();
    await settle(fixture);
    const supplierId = store.suppliers().at(-1)!.id;
    expect(store.supplier(supplierId)!.cnpj).toBe('11444777000161');

    type($(fixture, 'input[placeholder^="Ex.: 7.215"]'), '9.999');

    // Produto novo (cadastro rápido).
    choose($(fixture, '.ef__product select') as HTMLSelectElement, NEW);
    await openDialog();
    await submitDialog();
    expect(allInDialog('[role="alert"] li').length).toBeGreaterThan(1);
    const pickers = () => allInDialog<HTMLSelectElement>('app-name-picker select');
    choose(pickers()[0], 'Lattafa');
    await settleDialog();
    choose(pickers()[1], NEW);
    await settleDialog();
    type(inDialog('app-name-picker:nth-of-type(2) input'), 'Linha Teste');
    allInDialog('button')
      .find((b) => b.textContent?.includes('Adicionar'))!
      .click();
    await settleDialog();
    choose(pickers()[2], 'Perfume');
    choose(
      allInDialog<HTMLSelectElement>('select').find((s) => !s.closest('app-name-picker'))!,
      'Unissex',
    );
    type(allInDialog<HTMLInputElement>('input[inputmode="numeric"]')[0], '100');
    await settleDialog();
    await submitDialog();
    await dialogClosed();
    await settle(fixture);
    expect(TestBed.inject(AdminProductStore).find('lattafa-linha-teste')).toBeTruthy();

    // Segundo item, depois removido.
    buttonByText(fixture, 'Adicionar item').click();
    await settle(fixture);
    $(fixture, '[aria-label="Remover item 2"]').click();
    await settle(fixture);

    const [qty, cost] = $$(fixture, '.ef__items input') as HTMLInputElement[];
    type(qty, '6');
    type(cost, '120');
    await settle(fixture);
    expect(textOf(fixture)).toContain('720,00');
    buttonByText(fixture, 'Receber agora').click();
    await settle(fixture);
    const created = store.entries()[0];
    expect(created).toMatchObject({ invoice: '9.999', status: 'recebido', supplierId });
    expect(currentUrl()).toBe(`/admin/estoque/entradas/${created.id}`);
  });

  it('quick product: produto já cadastrado oferece "Usar este"', async () => {
    const { fixture } = await renderAt('/admin/estoque/entradas/nova', AdminEntryForm, {
      setup: () => loginAs('admin'),
    });
    const asad = TestBed.inject(AdminProductStore).find('lattafa-asad')!;
    choose($(fixture, '.ef__product select') as HTMLSelectElement, NEW);
    await openDialog();
    const pickers = () => allInDialog<HTMLSelectElement>('app-name-picker select');
    choose(pickers()[0], 'Lattafa');
    await settleDialog();
    choose(pickers()[1], asad.line);
    await settleDialog();
    if (asad.subtitle) type(allInDialog<HTMLInputElement>('input')[0], asad.subtitle);
    await submitDialog();
    allInDialog('button')
      .find((b) => b.textContent?.includes('Usar este'))!
      .click();
    await dialogClosed();
    await settle(fixture);
    expect(($(fixture, '.ef__product select') as HTMLSelectElement).value).toBe(
      asad.variants.find((v) => v.kind === 'frasco')!.id,
    );
  });
});

describe('Admin · fornecedores', () => {
  beforeEach(() => localStorage.clear());

  it('lista com busca por nome, marca ou CNPJ', async () => {
    const { fixture } = await renderAt('/admin/estoque/fornecedores', AdminSuppliers, {
      setup: () => loginAs('admin'),
    });
    const rows = () => $$(fixture, '.su__row').length;
    expect(rows()).toBeGreaterThanOrEqual(3);
    type($(fixture, 'input[type="search"]'), 'rasasi');
    await settle(fixture);
    expect(rows()).toBe(1);
    type($(fixture, 'input[type="search"]'), '77888');
    await settle(fixture);
    expect(rows()).toBe(1);
  });

  it('cadastro: valida, marca marcas (inclusive nova) e abre a ficha', async () => {
    const { fixture } = await renderAt('/admin/estoque/fornecedores/novo', AdminSupplierForm, {
      setup: () => loginAs('admin'),
    });
    const store = TestBed.inject(AdminPurchaseStore);
    const submit = async () => {
      $(fixture, 'form').dispatchEvent(new Event('submit'));
      await settle(fixture);
    };
    await submit();
    expect(textOf(fixture)).toContain('Informe a razão social.');

    const inputs = $$(fixture, 'fieldset input') as HTMLInputElement[];
    type(inputs[0], 'Casa dos Perfumes Ltda');
    type(inputs[1], 'Casa dos Perfumes');
    type(inputs[2], VALID_CNPJ);
    type(inputs[3], 'Rafa');
    type(inputs[4], '(11) 98888-7777');
    type(inputs[5], 'compras@casa.com.br');
    type(inputs[6], '5');
    type($(fixture, 'textarea'), 'Entrega às terças');
    $$(fixture, '.sf__chips button')[0].click();
    $$(fixture, '.sf__chips button')[0].click();
    $$(fixture, '.sf__chips button')[1].click();
    await settle(fixture);

    const picker = $(fixture, 'app-name-picker select') as HTMLSelectElement;
    choose(picker, NEW);
    await settle(fixture);
    type($(fixture, 'app-name-picker input'), 'Marca Inédita');
    buttonByText(fixture, 'Adicionar').click();
    await settle(fixture);
    expect($$(fixture, '.sf__chips button[aria-pressed="true"]')).toHaveLength(2);

    await submit();
    const saved = store.suppliers().at(-1)!;
    expect(saved).toMatchObject({ tradeName: 'Casa dos Perfumes', leadTimeDays: 5 });
    expect(saved.brands).toContain('Marca Inédita');
    expect(currentUrl()).toBe(`/admin/estoque/fornecedores/${saved.id}`);
  });

  it('ficha existente mostra compras; visualizador só lê', async () => {
    const { fixture } = await renderAt('/admin/estoque/fornecedores/2', AdminSupplierForm, {
      path: 'admin/estoque/fornecedores/:id',
      setup: () => loginAs('viewer'),
    });
    expect(($(fixture, 'fieldset') as HTMLFieldSetElement).disabled).toBe(true);
    expect(textOf(fixture)).toContain('7.215');
    expect($$(fixture, 'button[type="submit"]')).toHaveLength(0);
  });
});
