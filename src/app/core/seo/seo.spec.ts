import { readFileSync } from 'node:fs';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { productBySlug } from '../../../testing/test-helpers';
import { HELP_PAGES } from '../config/help-pages';
import { STORE_CONFIG } from '../config/store-config';
import { absolute, Seo, SeoTitleStrategy } from './seo';
import { productJsonLd, storeJsonLd } from './structured-data';

const head = () => document.head;
const meta = (attr: 'name' | 'property', key: string) =>
  head().querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)?.content;
const canonical = () => head().querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
const jsonLd = () => document.getElementById('seo-jsonld');

@Component({ template: '' })
class Blank {}

describe('SEO', () => {
  let seo: Seo;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    seo = TestBed.inject(Seo);
  });

  afterEach(() => {
    head()
      .querySelectorAll('meta[name], meta[property], link[rel="canonical"]')
      .forEach((el) => el.remove());
    jsonLd()?.remove();
  });

  it('página sem dados próprios usa o padrão da loja', () => {
    seo.update({}, '/');
    expect(document.title).toBe(`${STORE_CONFIG.name} | ${STORE_CONFIG.tagline}`);
    expect(meta('name', 'description')).toBe(STORE_CONFIG.description);
    expect(meta('name', 'robots')).toBe('index, follow');
    expect(meta('property', 'og:url')).toBe(STORE_CONFIG.siteUrl);
    expect(meta('property', 'og:image')).toBe(`${STORE_CONFIG.siteUrl}/img/og-nani.jpg`);
    expect(meta('property', 'og:type')).toBe('website');
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
    expect(canonical()).toBe(`${STORE_CONFIG.siteUrl}/`);
    expect(jsonLd()).toBeNull();
  });

  it('página própria: título, descrição cortada em 160, imagem, canonical e JSON-LD', () => {
    seo.update(
      {
        title: 'Asad | Nani Perfumes',
        description: 'x'.repeat(300),
        image: 'img/produtos/asad.webp',
        type: 'product',
        jsonLd: { name: '</script><script>alert(1)</script>' },
      },
      '/produtos/lattafa-asad',
    );
    expect(document.title).toBe('Asad | Nani Perfumes');
    expect(meta('name', 'description')).toHaveLength(160);
    expect(meta('name', 'description')?.endsWith('…')).toBe(true);
    expect(meta('property', 'og:image')).toBe(`${STORE_CONFIG.siteUrl}/img/produtos/asad.webp`);
    expect(meta('property', 'og:type')).toBe('product');
    expect(canonical()).toBe(`${STORE_CONFIG.siteUrl}/produtos/lattafa-asad`);
    // `<` escapado: o texto não fecha a tag <script>, mas o JSON continua igual.
    expect(jsonLd()?.textContent).not.toContain('<');
    expect(JSON.parse(jsonLd()!.textContent!).name).toBe('</script><script>alert(1)</script>');
  });

  it('noindex: robots bloqueia, sem canonical; a próxima página troca o JSON-LD', () => {
    seo.update({ jsonLd: { a: 1 } }, '/');
    seo.update({ noindex: true }, '/carrinho');
    expect(meta('name', 'robots')).toBe('noindex, nofollow');
    expect(canonical()).toBeUndefined();
    expect(jsonLd()).toBeNull();
    expect(head().querySelectorAll('meta[name="description"]')).toHaveLength(1);
  });

  it('caminho padrão é o endereço atual; absolute mantém URL completa', () => {
    seo.update({});
    expect(meta('property', 'og:url')).toBe(absolute(location.pathname));
    expect(absolute('https://cdn.exemplo.com/a.webp')).toBe('https://cdn.exemplo.com/a.webp');
  });

  it('navegação: título da rota, descrição e noindex herdado da rota pai', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: TitleStrategy, useClass: SeoTitleStrategy },
        provideRouter([
          {
            path: 'produtos',
            title: 'Perfumes | Nani Perfumes',
            data: { seo: { description: 'Catálogo' } },
            component: Blank,
          },
          {
            path: 'minha-conta',
            data: { seo: { noindex: true } },
            children: [{ path: 'pedidos', title: 'Meus pedidos', component: Blank }],
          },
          { path: '', component: Blank },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/produtos?marca=lattafa#topo');
    expect(document.title).toBe('Perfumes | Nani Perfumes');
    expect(meta('name', 'description')).toBe('Catálogo');
    expect(canonical()).toBe(`${STORE_CONFIG.siteUrl}/produtos`);

    await harness.navigateByUrl('/minha-conta/pedidos');
    expect(document.title).toBe('Meus pedidos');
    expect(meta('name', 'robots')).toBe('noindex, nofollow');

    await harness.navigateByUrl('/');
    expect(document.title).toBe(`${STORE_CONFIG.name} | ${STORE_CONFIG.tagline}`);
    expect(canonical()).toBe(`${STORE_CONFIG.siteUrl}/`);
  });
});

describe('Dados estruturados', () => {
  it('produto: faixa de preço das variantes, estoque, marca e avaliação', () => {
    const asad = productBySlug('lattafa-asad');
    const data = productJsonLd(asad, '/produtos/lattafa-asad') as {
      offers: Record<string, unknown>;
      brand: Record<string, unknown>;
      image: string[];
      aggregateRating?: unknown;
    };
    expect(data.brand['name']).toBe(asad.brandName);
    expect(data.image[0]).toMatch(/^https:\/\//);
    expect(data.offers['priceCurrency']).toBe('BRL');
    expect(Number(data.offers['lowPrice'])).toBeLessThanOrEqual(Number(data.offers['highPrice']));
    expect(data.offers['offerCount']).toBe(asad.variants.length);
    expect(data.offers['url']).toBe(`${STORE_CONFIG.siteUrl}/produtos/lattafa-asad`);

    const unrated = productJsonLd({ ...asad, rating: undefined, reviewCount: undefined }, '/x');
    expect(unrated).not.toHaveProperty('aggregateRating');
    const soldOut = productJsonLd(
      { ...asad, variants: asad.variants.map((v) => ({ ...v, stock: 0 })) },
      '/x',
    ) as { offers: Record<string, unknown> };
    expect(soldOut.offers['availability']).toBe('https://schema.org/OutOfStock');
  });

  it('loja: nome, site e redes sociais', () => {
    const data = storeJsonLd();
    expect(data['@type']).toBe('OnlineStore');
    expect(data['url']).toBe(STORE_CONFIG.siteUrl);
  });
});

/** Arquivos estáticos que repetem o domínio (o navegador não lê o store-config). */
describe('Domínio e arquivos de SEO', () => {
  const read = (path: string) => readFileSync(path, 'utf8');
  const domain = STORE_CONFIG.siteUrl;

  it('index.html, robots.txt e sitemap.xml usam o mesmo domínio do store-config', () => {
    const files = ['src/index.html', 'public/robots.txt', 'public/sitemap.xml'].map(read);
    for (const file of files) {
      const urls = file.match(/https?:\/\/[^/"'<\s]+/g) ?? [];
      const own = urls.filter((url) => url.includes('naniperfumes') || url.includes('nani'));
      expect(own.length).toBeGreaterThan(0);
      for (const url of own) expect(url).toBe(domain);
    }
  });

  it('sitemap tem todas as páginas de ajuda e robots bloqueia as privadas', () => {
    const sitemap = read('public/sitemap.xml');
    for (const page of HELP_PAGES) expect(sitemap).toContain(`${domain}/ajuda/${page.slug}<`);
    const robots = read('public/robots.txt');
    for (const path of ['/admin', '/minha-conta', '/finalizar-compra', '/carrinho', '/pedido/']) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
    expect(robots).toContain(`Sitemap: ${domain}/sitemap.xml`);
  });
});
