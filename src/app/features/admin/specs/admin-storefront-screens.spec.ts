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
import { StorefrontContent } from '../../../core/services/storefront-content';
import { ReviewService } from '../../../core/services/review-service';
import { AdminBannerForm } from '../banner-form/admin-banner-form';
import { AdminReviews } from '../reviews/admin-reviews';
import { AdminSettings } from '../settings/admin-settings';
import { AdminAnnouncements } from '../storefront/admin-announcements';
import { AdminBanners } from '../storefront/admin-banners';

const inDialog = <T extends HTMLElement = HTMLElement>(selector: string) =>
  dialogEl()!.querySelector<T>(selector)!;
const allInDialog = <T extends HTMLElement = HTMLElement>(selector: string) =>
  Array.from(dialogEl()!.querySelectorAll<T>(selector));
const submitDialog = async () => {
  inDialog('form').dispatchEvent(new Event('submit'));
  await settleDialog();
};
const pickFile = (input: HTMLElement, file: File) => {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
};

describe('Admin · vitrine: banners', () => {
  beforeEach(() => {
    localStorage.clear();
    URL.createObjectURL = vi.fn(() => 'blob:banner');
  });

  it('lista com ordem (subir/descer) e abas da vitrine', async () => {
    const { fixture } = await renderAt('/admin/vitrine', AdminBanners, {
      setup: () => {
        loginAs('admin');
        const content = TestBed.inject(StorefrontContent);
        content.saveBanner(null, {
          name: 'Segundo',
          image: 'a.webp',
          alt: 'Arte do segundo',
          active: true,
        });
      },
    });
    const content = TestBed.inject(StorefrontContent);
    const order = () => content.allBanners().map((b) => b.name);
    expect(textOf(fixture)).toContain('Avaliações');
    const last = order().at(-1)!;
    $(fixture, `[aria-label="Subir ${last}"]`).click();
    await settle(fixture);
    expect(order().at(-2)).toBe(last);
    $(fixture, `[aria-label="Descer ${last}"]`).click();
    await settle(fixture);
    expect(order().at(-1)).toBe(last);
  });

  it('novo banner: valida, envia arte, escolhe link e salva', async () => {
    const { fixture } = await renderAt('/admin/vitrine/banners/novo', AdminBannerForm, {
      extraRoutes: [{ path: 'admin/vitrine/banners/:id', component: AdminBannerForm }],
      setup: () => loginAs('admin'),
    });
    const submit = async () => {
      $(fixture, 'form').dispatchEvent(new Event('submit'));
      await settle(fixture);
    };
    await submit();
    expect(textOf(fixture)).toContain('Envie a imagem do celular.');

    type($(fixture, 'input[placeholder="Ex.: Black Friday 2026"]'), 'Semana do Oud');
    const files = $$(fixture, 'app-banner-image input[type="file"]');
    pickFile(files[0], new File(['x'], 'arte.gif', { type: 'image/gif' }));
    await settle(fixture);
    expect($$(fixture, 'app-banner-image [role="alert"]')).toHaveLength(1);
    pickFile(files[0], new File(['x'], 'arte.jpg', { type: 'image/jpeg' }));
    pickFile(files[1], new File(['x'], 'arte-larga.jpg', { type: 'image/jpeg' }));
    await settle(fixture);
    buttonByText(fixture, 'Remover').click();
    await settle(fixture);
    type($(fixture, 'textarea'), 'Semana do Oud: perfumes amadeirados em destaque');

    const preset = $(fixture, 'app-link-picker select') as HTMLSelectElement;
    preset.value = 'custom';
    preset.dispatchEvent(new Event('change'));
    await settle(fixture);
    type($(fixture, 'app-link-picker input'), 'https://site-de-fora.com');
    await submit();
    expect($$(fixture, '[role="alert"] li, .vf__problems li').length).toBeGreaterThan(0);
    type($(fixture, 'app-link-picker input'), '/produtos?marca=Lattafa');
    ($(fixture, 'input[type="checkbox"]') as HTMLInputElement).click();
    await submit();

    const saved = TestBed.inject(StorefrontContent).allBanners().at(-1)!;
    expect(saved).toMatchObject({ name: 'Semana do Oud', active: true, image: 'blob:banner' });
    expect(saved.imageDesktop).toBeUndefined();
    expect(saved.link).toEqual({ path: '/produtos', queryParams: { marca: 'Lattafa' } });
    expect(currentUrl()).toBe(`/admin/vitrine/banners/${saved.id}`);
  });

  it('excluir banner pede confirmação e volta para a lista', async () => {
    let id = 0;
    const { fixture } = await renderAt(() => `/admin/vitrine/banners/${id}`, AdminBannerForm, {
      path: 'admin/vitrine/banners/:id',
      setup: () => {
        loginAs('admin');
        id = TestBed.inject(StorefrontContent).saveBanner(null, {
          name: 'Para excluir',
          image: 'a.webp',
          alt: 'Arte para excluir',
          active: false,
        });
      },
    });
    buttonByText(fixture, 'Excluir').click();
    await openDialog();
    dialogButton('Excluir').click();
    await dialogClosed();
    await settle(fixture);
    expect(
      TestBed.inject(StorefrontContent)
        .allBanners()
        .some((b) => b.id === id),
    ).toBe(false);
    expect(currentUrl()).toBe('/admin/vitrine');
  });

  it('visualizador vê o banner sem poder salvar', async () => {
    const { fixture } = await renderAt('/admin/vitrine/banners/novo', AdminBannerForm, {
      setup: () => loginAs('viewer'),
    });
    expect(() => buttonByText(fixture, 'Salvar banner')).toThrow();
  });
});

describe('Admin · vitrine: avisos e frete grátis', () => {
  beforeEach(() => localStorage.clear());

  const open = (as = 'admin') =>
    renderAt('/admin/vitrine/avisos', AdminAnnouncements, { setup: () => loginAs(as) });

  it('cria, edita e exclui aviso pelo diálogo', async () => {
    const { fixture } = await open();
    const content = TestBed.inject(StorefrontContent);
    const count = content.allAnnouncements().length;
    buttonByText(fixture, 'Novo aviso').click();
    await openDialog();
    await submitDialog();
    expect(allInDialog('[role="alert"] li').length).toBeGreaterThan(0);
    const [text, active, from, to] = allInDialog<HTMLInputElement>('input');
    type(text, 'Frete grátis no Pix esta semana');
    active.click();
    type(from, '2026-11-01');
    type(to, '2026-11-07');
    await submitDialog();
    await dialogClosed();
    await settle(fixture);
    expect(content.allAnnouncements()).toHaveLength(count + 1);
    const created = content.allAnnouncements().at(-1)!;
    expect(created).toMatchObject({ active: false, startsOn: '2026-11-01' });

    $$(fixture, '.vl__main')
      .find((b) => b.textContent?.includes('Frete grátis no Pix'))!
      .click();
    await openDialog();
    dialogButton('Excluir').click();
    await dialogClosed();
    await settle(fixture);
    expect(content.allAnnouncements()).toHaveLength(count);
  });

  it('frete grátis: edita no diálogo (valida o valor) e na tela de configurações', async () => {
    const { fixture } = await open();
    const content = TestBed.inject(StorefrontContent);
    $$(fixture, '.vl__main')[0].click();
    await openDialog();
    const value = allInDialog<HTMLInputElement>('input').find(
      (i) => i.inputMode === 'decimal' || i.type === 'number',
    )!;
    type(value, '0');
    await submitDialog();
    expect(allInDialog('[role="alert"] li').length).toBeGreaterThan(0);
    type(value, '450');
    await submitDialog();
    await dialogClosed();
    expect(content.settings().freeShipping.min).toBe(450);

    TestBed.resetTestingModule();
    const settings = await renderAt('/admin/vitrine/configuracoes', AdminSettings, {
      setup: () => loginAs('admin'),
    });
    const f = settings.fixture;
    ($$(f, 'app-free-shipping-editor input[type="checkbox"]')[0] as HTMLInputElement).click();
    $(f, 'app-free-shipping-editor form').dispatchEvent(new Event('submit'));
    await settle(f);
    expect(TestBed.inject(StorefrontContent).settings().freeShipping.active).toBe(false);
    expect(TestBed.inject(StorefrontContent).freeShippingLive()).toBe(false);
  });

  it('visualizador não cria aviso', async () => {
    const { fixture } = await open('viewer');
    expect(() => buttonByText(fixture, 'Novo aviso')).toThrow();
  });
});

describe('Admin · vitrine: avaliações', () => {
  beforeEach(() => localStorage.clear());

  const open = (as = 'admin') =>
    renderAt('/admin/vitrine/avaliacoes', AdminReviews, { setup: () => loginAs(as) });
  const review = (id: number) => TestBed.inject(ReviewService).find(id)!;

  it('aprova e reprova (motivo obrigatório, "Outro" com texto); busca', async () => {
    const { fixture } = await open();
    expect(textOf(fixture)).toContain('Tem link'); // destaque de spam numa pendente
    type($(fixture, 'input[type="search"]'), 'Patrícia');
    await settle(fixture);
    buttonByText(fixture, 'Aprovar').click();
    await settle(fixture);
    expect(review(9001).status).toBe('aprovada');
    type($(fixture, 'input[type="search"]'), '');
    await settle(fixture);

    buttonByText(fixture, 'Reprovar').click();
    await openDialog();
    dialogButton('Reprovar').click();
    await settleDialog();
    expect(dialogEl()!.textContent).toContain('Escolha um motivo.');
    allInDialog<HTMLInputElement>('input[type="radio"]').at(-1)!.click();
    await settleDialog();
    dialogButton('Reprovar').click();
    await settleDialog();
    expect(dialogEl()!.textContent).toContain('Escreva o motivo.');
    type(inDialog('[aria-label="Outro motivo"]'), 'Fala de outra loja');
    dialogButton('Reprovar').click();
    await dialogClosed();
    await settle(fixture);
    const refused = TestBed.inject(ReviewService)
      .all()
      .find((r) => r.moderation?.reason === 'Fala de outra loja')!;
    expect(refused.status).toBe('reprovada');

    $$(fixture, '[role="tab"]')[2].click();
    await settle(fixture);
    buttonByText(fixture, 'Aprovar mesmo assim').click();
    await settle(fixture);
    expect(review(refused.id).status).toBe('aprovada');
  });

  it('aprovada: responde (valida), edita, remove a resposta e tira do ar', async () => {
    const { fixture } = await open();
    TestBed.inject(ReviewService).setStatus(9002, 'aprovada', 'Admin');
    $$(fixture, '[role="tab"]')[1].click();
    type($(fixture, 'input[type="search"]'), 'Gabriel');
    await settle(fixture);

    buttonByText(fixture, 'Responder').click();
    await openDialog();
    type(inDialog('textarea'), 'oi');
    dialogButton('Publicar resposta').click();
    await settleDialog();
    expect(dialogEl()!.querySelector('[role="alert"]')).not.toBeNull();
    type(inDialog('textarea'), 'Obrigado, Gabriel! Aplique também na roupa.');
    dialogButton('Publicar resposta').click();
    await dialogClosed();
    await settle(fixture);
    expect(review(9002).reply?.text).toContain('Obrigado, Gabriel');

    buttonByText(fixture, 'Remover resposta').click();
    await openDialog();
    dialogButton('Remover').click();
    await dialogClosed();
    await settle(fixture);
    expect(review(9002).reply?.text ?? '').toBe('');

    buttonByText(fixture, 'Tirar do ar').click();
    await openDialog();
    allInDialog<HTMLInputElement>('input[type="radio"]')[0].click();
    await settleDialog();
    dialogButton('Tirar do ar').click();
    await dialogClosed();
    expect(review(9002).status).toBe('reprovada');
  });

  it('visualizador só lê', async () => {
    const { fixture } = await open('viewer');
    expect($$(fixture, '.ap__actions')).toHaveLength(0);
  });
});
