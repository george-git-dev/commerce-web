import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { $, $$, currentUrl, renderAt, settle, textOf, type } from '../../../testing/test-helpers';
import { apiInterceptor } from '../../core/http/api-interceptor';
import { mockApiInterceptor } from '../../core/http/mock-api-interceptor';
import { Product } from '../../core/models/product';
import { CartStore } from '../../core/services/cart-store';
import { CatalogService } from '../../core/services/catalog-service';
import {
  effectivePrice,
  hasDeal,
  hasKind,
  isAvailable,
  lowestPrice,
} from '../../core/utils/product-pricing';
import { Catalog } from './catalog';

const http = provideHttpClient(withInterceptors([apiInterceptor, mockApiInterceptor]));
const open = (url: string) => renderAt(url, Catalog, { path: 'produtos', providers: [http] });
const names = (f: Parameters<typeof $$>[0]) =>
  $$(f, 'app-product-card .card__name').map((el) => el.textContent?.trim());
const all = () => TestBed.inject(CatalogService).products();

describe('Catálogo', () => {
  beforeEach(() => localStorage.clear());

  const cases: [string, (p: Product) => boolean][] = [
    ['categoria=kit', (p) => p.category === 'kit'],
    ['categoria=hidratante,body-splash', (p) => ['hidratante', 'body-splash'].includes(p.category)],
    ['genero=Feminino', (p) => p.gender === 'Feminino'],
    ['marca=Lattafa', (p) => p.brandName === 'Lattafa'],
    ['oferta=true', (p) => hasDeal(p)],
    ['lancamento=true', (p) => !!p.launch],
    ['maisVendido=true', (p) => !!p.bestSeller],
    ['nota=4', (p) => (p.rating ?? 0) >= 4],
    ['estoque=true', (p) => isAvailable(p)],
    ['tipo=decant', (p) => hasKind(p, 'decant')],
    ['familia=Oriental', (p) => p.families.includes('Oriental')],
    ['ocasiao=noite', (p) => !!p.occasions?.includes('noite')],
    [
      'precoMin=100&precoMax=200',
      (p) => p.variants.some((v) => effectivePrice(v) >= 100 && effectivePrice(v) <= 200),
    ],
    [
      'busca=asad',
      (p) => `${p.name} ${p.brandName} ${p.families.join(' ')}`.toLowerCase().includes('asad'),
    ],
  ];

  for (const [query, rule] of cases) {
    it(`filtro ?${query} mostra só o que bate`, async () => {
      const { fixture } = await open(`/produtos?${query}`);
      const expected = all().filter(rule).length;
      expect($$(fixture, 'app-product-card')).toHaveLength(expected);
    });
  }

  it('sem filtro mostra tudo; ordenação por menor e maior preço', async () => {
    const { fixture } = await open('/produtos?ordenar=menor-preco');
    expect($$(fixture, 'app-product-card')).toHaveLength(all().length);
    const cheapest = [...all()].sort((a, b) => lowestPrice(a) - lowestPrice(b))[0];
    expect(names(fixture)[0]).toBe(cheapest.name);
    TestBed.resetTestingModule();
    const desc = await open('/produtos?ordenar=maior-preco');
    const priciest = [...TestBed.inject(CatalogService).products()].sort(
      (a, b) => lowestPrice(b) - lowestPrice(a),
    )[0];
    expect(names(desc.fixture)[0]).toBe(priciest.name);
  });

  it('ordena por mais vendidos e avaliação', async () => {
    const { fixture } = await open('/produtos?ordenar=avaliacao');
    const best = [...all()].sort(
      (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
    )[0];
    expect(names(fixture)[0]).toBe(best.name);
    TestBed.resetTestingModule();
    const sold = await open('/produtos?ordenar=mais-vendidos');
    const top = [...TestBed.inject(CatalogService).products()].sort(
      (a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0),
    )[0];
    expect(names(sold.fixture)[0]).toBe(top.name);
  });

  it('título: categoria, destaque ou "todos"', async () => {
    const { fixture } = await open('/produtos?lancamento=true&oferta=true');
    expect(textOf(fixture)).toContain('Lançamentos · Ofertas');
  });

  it('chips mudam a URL (e combinam categorias); "Limpar" zera os filtros', async () => {
    const { fixture } = await open('/produtos');
    const chip = $$(fixture, 'button').find((b) => b.textContent?.trim().startsWith('Kits'));
    chip?.click();
    await settle(fixture);
    expect(decodeURIComponent(currentUrl())).toContain('categoria=kit');
    $$(fixture, 'button')
      .find((b) => b.textContent?.trim().startsWith('Hidratantes'))
      ?.click();
    await settle(fixture);
    expect(decodeURIComponent(currentUrl())).toMatch(
      /categoria=kit,hidratante|categoria=hidratante,kit/,
    );
    $(fixture, '.filter-clear').click();
    await settle(fixture);
    expect(currentUrl()).toBe('/produtos');
  });

  it('preço aceita só dígitos e vira filtro; família e ocasião por checkbox', async () => {
    const { fixture } = await open('/produtos');
    const min = $$(fixture, 'input').find(
      (i) => i.getAttribute('inputmode') === 'numeric',
    ) as HTMLInputElement;
    type(min, '1a2b0');
    expect(min.value).toBe('120');
    min.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(currentUrl()).toContain('precoMin=120');
    const checkboxes = $$(fixture, 'input[type=checkbox]') as HTMLInputElement[];
    checkboxes[0].dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(currentUrl()).toMatch(/familia=|ocasiao=/);
  });

  it('nenhum resultado mostra o estado vazio; adicionar do card vai para a sacola', async () => {
    const { fixture } = await open('/produtos?busca=zzzzzz');
    expect($$(fixture, 'app-empty-state')).toHaveLength(1);
    TestBed.resetTestingModule();
    const page = await open('/produtos');
    $$(page.fixture, '.card__buy')
      .find((b) => !(b as HTMLButtonElement).disabled)
      ?.click();
    await vi.waitFor(() => expect(TestBed.inject(CartStore).count()).toBe(1), { timeout: 2000 });
  });

  it('filtros no celular abrem e fecham', async () => {
    const { fixture, instance } = await open('/produtos');
    const filters = instance as unknown as { filtersOpen: { (): boolean; set(v: boolean): void } };
    filters.filtersOpen.set(true);
    await settle(fixture);
    expect(filters.filtersOpen()).toBe(true);
    $$(fixture, '[aria-label*="Fechar"], .filters__backdrop')[0]?.click();
    await settle(fixture);
  });
});
