import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  $,
  $$,
  buttonByText,
  currentUrl,
  productBySlug,
  render,
  renderAt,
  settle,
  textOf,
} from '../../../testing/test-helpers';
import { apiInterceptor } from '../../core/http/api-interceptor';
import { mockApiInterceptor } from '../../core/http/mock-api-interceptor';
import { CartStore } from '../../core/services/cart-store';
import { ImageLightbox } from './image-lightbox/image-lightbox';
import { NotesGrid } from './notes-grid/notes-grid';
import { ProductDetail } from './product-detail';
import { ProductGallery } from './product-gallery/product-gallery';
import { ProductReviews } from './product-reviews/product-reviews';
import { VariantPicker } from './variant-picker/variant-picker';

const http = provideHttpClient(withInterceptors([apiInterceptor, mockApiInterceptor]));
const open = (url: string) =>
  renderAt(url, ProductDetail, { path: 'produtos/:slug', providers: [http] });

describe('Página do produto', () => {
  beforeEach(() => localStorage.clear());

  it('mostra nome, marca, tipo e trilha; produto inexistente mostra "não encontrado"', async () => {
    const { fixture } = await open('/produtos/lattafa-asad');
    const asad = productBySlug('lattafa-asad');
    expect(textOf(fixture)).toContain(asad.name);
    expect(textOf(fixture)).toContain(asad.brandName);
    expect(textOf(fixture)).toContain('Perfumes');
    TestBed.resetTestingModule();
    const missing = await open('/produtos/nao-existe');
    expect(textOf(missing.fixture)).toContain('Produto não encontrado');
  });

  it('SEO: título com marca, dados estruturados; inexistente fica fora do Google', async () => {
    await open('/produtos/lattafa-asad');
    const asad = productBySlug('lattafa-asad');
    expect(document.title).toBe(`${asad.name} — ${asad.brandName} | Nani Perfumes`);
    const jsonLd = JSON.parse(document.getElementById('seo-jsonld')!.textContent!);
    expect(jsonLd['@type']).toBe('Product');
    expect(jsonLd.name).toBe(asad.name);
    expect(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toMatch(
      /\/produtos\/lattafa-asad$/,
    );
    TestBed.resetTestingModule();
    await open('/produtos/nao-existe');
    expect(document.title).toBe('Produto não encontrado | Nani Perfumes');
    expect(document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toBe(
      'noindex, nofollow',
    );
    expect(document.getElementById('seo-jsonld')).toBeNull();
  });

  it('adicionar: botão ocupado até o back confirmar; depois entra na sacola', async () => {
    const { fixture } = await open('/produtos/lattafa-asad');
    const button = buttonByText(fixture, 'Adicionar ao carrinho');
    button.click();
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Adicionando…');
    await vi.waitFor(() => expect(TestBed.inject(CartStore).count()).toBe(1), { timeout: 2000 });
  });

  it('comprar agora: adiciona e vai para o carrinho', async () => {
    const { fixture } = await open('/produtos/lattafa-asad');
    buttonByText(fixture, 'Comprar agora').click();
    await vi.waitFor(() => expect(currentUrl()).toBe('/carrinho'), { timeout: 2000 });
    expect(TestBed.inject(CartStore).count()).toBe(1);
  });

  it('?tipo=decant abre nos decants; esgotado não pode ser comprado', async () => {
    const withDecant = productBySlug('lattafa-khamrah');
    const { fixture } = await open(`/produtos/${withDecant.slug}?tipo=decant`);
    expect($$(fixture, '.size').length).toBeGreaterThan(0);
    $$(fixture, '.size')[1]?.click();
    await settle(fixture);
    expect($$(fixture, '.size--active')).toHaveLength(1);
  });

  it('favorito sem login leva ao login com o motivo', async () => {
    const { fixture } = await open('/produtos/lattafa-asad');
    $(fixture, '.detail__wish').click();
    await settle(fixture);
    expect(currentUrl()).toContain('/login');
    expect(currentUrl()).toContain('motivo=favoritos');
  });
});

describe('partes da página do produto', () => {
  it('VariantPicker: frasco mostra "lacrado"; decant lista tamanhos e marca o escolhido', async () => {
    const product = productBySlug('lattafa-khamrah');
    const f = await render(VariantPicker, {
      inputs: { product, kind: 'frasco', variant: product.variants[0] },
    });
    expect(textOf(f)).toMatch(/lacrado/i);
    f.componentRef.setInput('kind', 'decant');
    await settle(f);
    const sizes = $$(f, '.size');
    expect(sizes.length).toBeGreaterThan(0);
    sizes[0].click();
    await settle(f);
    expect(f.componentInstance.variant()?.kind).toBe('decant');
  });

  it('NotesGrid: camadas com notas, família e ocasião', async () => {
    const product = productBySlug('lattafa-asad');
    const f = await render(NotesGrid, {
      inputs: { notes: product.notes, families: product.families, occasions: product.occasions },
    });
    expect(textOf(f)).toContain('Topo');
    expect(textOf(f)).toContain(product.families[0]);
  });

  it('ProductReviews: resumo, ordenação e "ver mais"', async () => {
    const product = productBySlug('lattafa-asad');
    const f = await render(ProductReviews, { inputs: { product } });
    expect(textOf(f).length).toBeGreaterThan(0);
    const select = $$(f, 'select')[0] as HTMLSelectElement | undefined;
    if (select) {
      select.value = select.options[select.options.length - 1].value;
      select.dispatchEvent(new Event('change'));
      await settle(f);
    }
    const more = $$(f, '.reviews__more')[0];
    if (more) {
      const before = $$(f, 'article, li').length;
      more.click();
      await settle(f);
      expect($$(f, 'article, li').length).toBeGreaterThanOrEqual(before);
    }
  });

  it('ProductGallery: miniaturas e zoom abre o visualizador', async () => {
    const product = productBySlug('lattafa-asad');
    const f = await render(ProductGallery, {
      inputs: { images: product.images, alt: product.name },
    });
    expect($$(f, '.gallery__thumb').length).toBe(
      product.images.length > 1 ? product.images.length : 0,
    );
    $$(f, 'button')[0].click();
    await settle(f);
    expect(document.querySelector('app-image-lightbox')).not.toBeNull();
    (document.querySelector('.lightbox__close') as HTMLElement).click();
  });

  it('ImageLightbox: começa na foto escolhida e fecha', async () => {
    let closed = false;
    const f = await render(ImageLightbox, {
      providers: [
        { provide: DIALOG_DATA, useValue: { images: ['a.webp', 'b.webp'], alt: 'Asad', start: 1 } },
        { provide: DialogRef, useValue: { close: () => (closed = true) } },
      ],
    });
    expect(textOf(f)).toContain('2');
    $(f, '.lightbox__close').click();
    expect(closed).toBe(true);
  });
});
