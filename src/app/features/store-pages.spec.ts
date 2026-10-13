import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  $,
  $$,
  loginAs,
  productBySlug,
  render,
  renderAt,
  settle,
  textOf,
  type,
} from '../../testing/test-helpers';
import { HELP_PAGES } from '../core/config/help-pages';
import { apiInterceptor } from '../core/http/api-interceptor';
import { mockApiInterceptor } from '../core/http/mock-api-interceptor';
import { CartStore } from '../core/services/cart-store';
import { FavoritesStore } from '../core/services/favorites-store';
import { OrderService } from '../core/services/order-service';
import { StorefrontContent } from '../core/services/storefront-content';
import { Favorites } from './favorites/favorites';
import { HelpPageView } from './help/help-page';
import { BannerCarousel } from './home/sections/banner-carousel/banner-carousel';
import { NewsletterSection } from './home/sections/newsletter-section/newsletter-section';
import { NotFound } from './not-found/not-found';
import { OrderConfirmation } from './order-confirmation/order-confirmation';

const http = provideHttpClient(withInterceptors([apiInterceptor, mockApiInterceptor]));

describe('Favoritos', () => {
  beforeEach(() => localStorage.clear());

  it('vazio mostra o estado vazio; com itens, tira o favorito e adiciona à sacola', async () => {
    const empty = await render(Favorites, { providers: [http] });
    expect($$(empty, 'app-empty-state')).toHaveLength(1);
    TestBed.resetTestingModule();
    const f = await render(Favorites, { providers: [http] });
    loginAs('customer');
    TestBed.inject(FavoritesStore).add(productBySlug('lattafa-asad'));
    await settle(f);
    expect($$(f, 'app-product-card')).toHaveLength(1);
    $(f, '.card__buy').click();
    await vi.waitFor(() => expect(TestBed.inject(CartStore).count()).toBe(1), { timeout: 2000 });
    $(f, '.card__wish').click();
    await settle(f);
    expect($$(f, 'app-product-card')).toHaveLength(0);
  });
});

describe('Confirmação do pedido', () => {
  beforeEach(() => localStorage.clear());

  const open = (number: string) =>
    renderAt(`/pedido/${number}`, OrderConfirmation, {
      path: 'pedido/:numero',
      setup: () => loginAs('customer'),
    });

  it('Pix aguardando mostra o código; pedido inexistente avisa', async () => {
    const { fixture } = await open('NP100258');
    expect($$(fixture, 'app-pix-payment')).toHaveLength(1);
    TestBed.resetTestingModule();
    const missing = await open('NP000000');
    expect(textOf(missing.fixture)).toContain('Pedido não encontrado');
  });

  it('pago com crédito na loja (total zero) mostra a mensagem certa', async () => {
    let number = '';
    const { fixture } = await renderAt(() => `/pedido/${number}`, OrderConfirmation, {
      path: 'pedido/:numero',
      setup: () => {
        loginAs('customer');
        const orders = TestBed.inject(OrderService);
        const { number: _n, createdAt: _c, status: _s, ...draft } = orders.orders()[0];
        number = orders.place({
          ...draft,
          payment: { method: 'pix' },
          total: 0,
          storeCredit: 100,
        }).number;
        expect(orders.find(number)?.status).toBe('pago');
      },
    });
    expect(textOf(fixture)).toMatch(/crédito na loja/i);
  });
});

describe('Ajuda', () => {
  for (const page of HELP_PAGES) {
    it(`/ajuda/${page.slug} abre com título e seções`, async () => {
      const { fixture } = await renderAt(`/ajuda/${page.slug}`, HelpPageView, {
        path: 'ajuda/:pagina',
      });
      expect(textOf(fixture)).toContain(page.title);
    });
  }

  it('página inexistente avisa', async () => {
    const { fixture } = await renderAt('/ajuda/nao-existe', HelpPageView, {
      path: 'ajuda/:pagina',
    });
    expect(textOf(fixture)).toContain('Página não encontrada');
  });

  it('texto de frete grátis some quando a promoção não está no ar', async () => {
    const { fixture } = await renderAt('/ajuda/envio-e-prazos', HelpPageView, {
      path: 'ajuda/:pagina',
      setup: () => {
        const storefront = TestBed.inject(StorefrontContent);
        const settings = storefront.settings();
        storefront.saveSettings({
          ...settings,
          freeShipping: { ...settings.freeShipping, active: false },
        });
      },
    });
    expect(textOf(fixture)).not.toContain('{freteGratis}');
  });
});

describe('Home e 404', () => {
  it('newsletter: vazio não envia; com e-mail agradece', async () => {
    const f = await render(NewsletterSection);
    $(f, 'form').dispatchEvent(new Event('submit'));
    await settle(f);
    expect($$(f, 'form')).toHaveLength(1);
    type($(f, 'input'), 'ana@email.com');
    $(f, 'form').dispatchEvent(new Event('submit'));
    await settle(f);
    expect($$(f, 'form')).toHaveLength(0);
  });

  it('carrossel mostra os banners no ar e o botão de pausar', async () => {
    const f = await render(BannerCarousel);
    const count = TestBed.inject(StorefrontContent).banners().length;
    expect($$(f, 'swiper-slide')).toHaveLength(count);
    expect($$(f, '.banners__toggle')).toHaveLength(count > 1 ? 1 : 0);
  });

  it('404 tem link para a loja', async () => {
    const f = await render(NotFound);
    expect($$(f, 'a').length).toBeGreaterThan(0);
  });
});
