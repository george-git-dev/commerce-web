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
  type,
} from '../../../../testing/test-helpers';
import { ComponentFixture } from '@angular/core/testing';
import { AdminProductForm } from '../product-form/admin-product-form';
import { AdminProducts } from '../products/admin-products';
import { AdminProductStore } from '../services/admin-product-store';

const NEW = '__novo__';
const choose = (select: HTMLElement, value: string) => {
  (select as HTMLSelectElement).value = value;
  select.dispatchEvent(new Event('change'));
};
const pickFile = (input: HTMLElement, files: File[]) => {
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new Event('change'));
};
const jpg = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

describe('Admin · lista de produtos', () => {
  beforeEach(() => localStorage.clear());

  it('filtros por marca, categoria, situação, estoque baixo e busca', async () => {
    const { fixture } = await renderAt('/admin/produtos', AdminProducts, {
      setup: () => loginAs('admin'),
    });
    const rows = () =>
      $$(fixture, 'a[href^="/admin/produtos/"]').filter((a) => !a.textContent?.includes('Novo'))
        .length;
    const all = rows();
    expect(all).toBeGreaterThan(0);
    const [brand, category, status] = $$(fixture, 'select');
    choose(brand, 'Lattafa');
    await settle(fixture);
    expect(rows()).toBeLessThan(all);
    choose(brand, 'todas');
    choose(category, 'kit');
    choose(status, 'rascunho');
    await settle(fixture);
    choose(category, 'todas');
    choose(status, 'todos');
    ($(fixture, 'input[type="checkbox"]') as HTMLInputElement).click();
    await settle(fixture);
    ($(fixture, 'input[type="checkbox"]') as HTMLInputElement).click();
    type($(fixture, 'input[type="search"]'), 'lattafa-asad-100');
    await settle(fixture);
    expect(rows()).toBe(1);
  });
});

describe('Admin · cadastro de produto', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => `blob:${Math.random()}`);
    URL.revokeObjectURL = vi.fn();
  });

  const problems = (f: ComponentFixture<unknown>) =>
    $$(f, '.pf__problems li').map((li) => li.textContent?.trim());
  const next = async (f: ComponentFixture<unknown>) => {
    buttonByText(f, 'Próximo').click();
    await settle(f);
  };
  const pickers = (f: ComponentFixture<unknown>) => $$(f, 'app-name-picker select');

  it('novo perfume: valida cada etapa, cria nota e imagens, e publica', async () => {
    const { fixture: f } = await renderAt('/admin/produtos/novo', AdminProductForm, {
      setup: () => loginAs('admin'),
    });
    const store = TestBed.inject(AdminProductStore);
    expect(textOf(f)).toContain('Novo produto');

    // Etapa 1 — Dados.
    await next(f);
    expect(problems(f)).toContain('Escolha a categoria.');
    choose(pickers(f)[0], 'Lattafa');
    await settle(f);
    choose(pickers(f)[1], NEW);
    await settle(f);
    type($(f, 'app-name-picker:nth-of-type(2) input'), 'Oud Teste');
    buttonByText(f, 'Adicionar').click();
    await settle(f);
    type($(f, '[formControlName="subtitle"]'), 'Noir');
    choose(pickers(f)[2], 'Perfume');
    await settle(f);
    choose($(f, '[formControlName="gender"]'), 'Unissex');
    choose($(f, '[formControlName="concentration"]'), 'Eau de Parfum');
    type($(f, '[formControlName="description"]'), 'Oud amadeirado com baunilha, fixação longa.');
    await settle(f);
    await next(f);
    expect(problems(f)).toEqual([]);

    // Etapa 2 — Variantes.
    await next(f);
    expect(problems(f)).toContain('Ative o frasco ou marque algum tamanho de decant.');
    ($(f, '[formControlName="enabled"]') as HTMLInputElement).click();
    await settle(f);
    type($(f, '[formControlName="volumeMl"]'), '100');
    type($(f, '[formControlName="price"]'), '299.9');
    const sizes = $$(f, '.pf__sizes li');
    (sizes[0].querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    await settle(f);
    await next(f);
    expect(problems(f)).toContain('Informe o preço de cada decant marcado (maior que zero).');
    type($(f, '[aria-label="Preço do decant de 2 ml"]'), '19.9');
    type($(f, '[aria-label="Outro tamanho de decant em ml"]'), '7');
    buttonByText(f, 'Adicionar tamanho').click();
    await settle(f);
    type($(f, '[aria-label="Preço do decant de 7 ml"]'), '39.9');
    await next(f);
    expect(problems(f)).toEqual([]);

    // Etapa 3 — Perfil olfativo (com nota nova).
    await next(f);
    expect(problems(f).length).toBe(3);
    $$(f, '.pf__chips')[0].querySelector('button')!.click();
    $$(f, '.pf__chips')[1].querySelector('button')!.click();
    await settle(f);
    const layers = $$(f, 'app-note-layer select');
    choose(layers[0], store.noteNames()[0]);
    await settle(f);
    choose($$(f, 'app-note-layer select')[1], '__nova__');
    await settle(f);
    buttonByText(f, 'Adicionar').click();
    await settle(f);
    expect(textOf(f)).toContain('Informe o nome da nota.');
    type($(f, '[aria-label="Nome da nova nota"]'), 'Nota Inédita');
    buttonByText(f, 'Adicionar').click();
    await settle(f);
    expect(textOf(f)).toContain('A nota precisa de uma imagem.');
    pickFile($(f, 'app-note-layer input[type="file"]'), [jpg('fumaca.jpg')]);
    await settle(f);
    buttonByText(f, 'Adicionar').click();
    await settle(f);
    expect(store.noteNames()).toContain('Nota Inédita');
    $(f, '[aria-label="Remover Nota Inédita"]').click();
    await settle(f);
    await next(f);

    // Etapa 4 — Imagens.
    await next(f);
    expect(problems(f)).toEqual(['Envie pelo menos uma imagem.']);
    const file = () => $(f, 'app-product-images input[type="file"]');
    pickFile(file(), [new File(['x'], 'nota.pdf', { type: 'application/pdf' })]);
    await settle(f);
    expect(textOf(f)).toContain('nota.pdf:');
    pickFile(file(), [jpg('a.jpg'), jpg('b.jpg'), jpg('c.jpg')]);
    await settle(f);
    $$(f, '[aria-label="Mover para a direita"]')[0].click();
    $$(f, '[aria-label="Mover para a esquerda"]')[0].click();
    $$(f, '[aria-label="Remover imagem"]')[2].click();
    await settle(f);
    expect($$(f, '[aria-label="Remover imagem"]')).toHaveLength(2);
    await next(f);

    // Etapa 5 — Vitrine: selo automático é recusado.
    choose($(f, 'app-name-picker select'), NEW);
    await settle(f);
    type($(f, 'app-name-picker input'), 'Oferta');
    buttonByText(f, 'Adicionar').click();
    await settle(f);
    buttonByText(f, 'Publicar').click();
    await settle(f);
    expect(problems(f)[0]).toContain('a loja coloca sozinha');
    choose($(f, 'app-name-picker select'), '');
    await settle(f);
    expect(textOf(f)).toContain('Frasco 100 ml');
    buttonByText(f, 'Publicar').click();
    await settle(f);

    const saved = store.find('lattafa-oud-teste-noir')!;
    expect(saved).toMatchObject({
      status: 'publicado',
      concentration: 'Eau de Parfum',
      name: 'Oud Teste Noir',
    });
    expect(saved.variants.map((v) => v.id)).toEqual([
      'lattafa-oud-teste-noir-100',
      'lattafa-oud-teste-noir-d2',
      'lattafa-oud-teste-noir-d7',
    ]);
    expect(saved.images).toHaveLength(2);
    expect(currentUrl()).toBe('/admin/produtos');
  });

  it('rascunho precisa só de marca e linha; duplicado é barrado', async () => {
    const { fixture: f } = await renderAt('/admin/produtos/novo', AdminProductForm, {
      setup: () => loginAs('admin'),
    });
    const store = TestBed.inject(AdminProductStore);
    const asad = store.find('lattafa-asad')!;
    buttonByText(f, 'Salvar rascunho').click();
    await settle(f);
    expect(problems(f).length).toBeGreaterThan(0);

    choose(pickers(f)[0], 'Lattafa');
    await settle(f);
    choose(pickers(f)[1], asad.line);
    type($(f, '[formControlName="subtitle"]'), asad.subtitle ?? '');
    await settle(f);
    expect(textOf(f)).toContain('Este produto já existe');
    buttonByText(f, 'Salvar rascunho').click();
    await settle(f);
    expect(problems(f).join()).toContain('já está cadastrado');

    type($(f, '[formControlName="subtitle"]'), 'Versão Nova');
    choose(pickers(f)[2], 'Kit');
    await settle(f);
    expect($$(f, '[formControlName="kitItems"]')).toHaveLength(1);
    buttonByText(f, 'Salvar rascunho').click();
    await settle(f);
    expect(store.products().find((p) => p.subtitle === 'Versão Nova')?.status).toBe('rascunho');
  });

  it('editar: renomeia a marca ali mesmo e volta etapas; indicador bloqueia pular', async () => {
    const { fixture: f } = await renderAt('/admin/produtos/lattafa-asad', AdminProductForm, {
      path: 'admin/produtos/:slug',
      setup: () => loginAs('admin'),
    });
    const store = TestBed.inject(AdminProductStore);
    expect(textOf(f)).toContain('Publicado');

    buttonByText(f, 'Renomear marca').click();
    await settle(f);
    const input = $(f, 'app-brand-rename input');
    type(input, 'Armaf');
    buttonByText(f, 'Salvar nome').click();
    await settle(f);
    expect(
      $$(f, 'app-brand-rename [role="alert"], app-brand-rename .rn__error, app-brand-rename li')
        .length,
    ).toBeGreaterThan(0);
    type(input, 'Lattafa Perfumes');
    buttonByText(f, 'Salvar nome').click();
    await settle(f);
    expect(store.find('lattafa-asad')!.brandName).toBe('Lattafa Perfumes');

    buttonByText(f, 'Renomear marca').click();
    await settle(f);
    buttonByText(f, 'Cancelar').click();
    await settle(f);

    const steps = $$(f, 'app-form-steps button');
    steps[4].click();
    await settle(f);
    expect(textOf(f)).toContain('Resumo');
    $(f, '[aria-label="Voltar"]').click();
    await settle(f);
    buttonByText(f, 'Salvar rascunho').click();
    await settle(f);
    expect(store.find('lattafa-asad')!.status).toBe('rascunho');
  });

  it('visualizador navega livre e não salva', async () => {
    const { fixture: f } = await renderAt('/admin/produtos/lattafa-asad', AdminProductForm, {
      path: 'admin/produtos/:slug',
      setup: () => loginAs('viewer'),
    });
    expect(textOf(f)).toContain('Somente leitura.');
    $$(f, 'app-form-steps button')[4].click();
    await settle(f);
    expect(textOf(f)).toContain('Resumo');
    expect(() => buttonByText(f, 'Publicar')).toThrow();
    expect(() => buttonByText(f, 'Salvar rascunho')).toThrow();
  });
});
