import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { a11yViolations, loginAs, render, renderAt, settle } from '../../testing/test-helpers';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { apiInterceptor } from '../core/http/api-interceptor';
import { mockApiInterceptor } from '../core/http/mock-api-interceptor';
import { CartStore } from '../core/services/cart-store';
import { CatalogService } from '../core/services/catalog-service';
import { Footer } from '../layout/footer/footer';
import { Header } from '../layout/header/header';
import { Account } from './account/account';
import { Addresses } from './account/addresses/addresses';
import { OrderDetail } from './account/order-detail/order-detail';
import { Orders } from './account/orders/orders';
import { Profile } from './account/profile/profile';
import { ReturnRequestPage } from './account/return-request/return-request';
import { AffiliateLanding } from './affiliate/affiliate-landing';
import { Login } from './auth/login';
import { ForgotPassword } from './auth/forgot-password';
import { Cart } from './cart/cart';
import { Catalog } from './catalog/catalog';
import { Checkout } from './checkout/checkout';
import { Favorites } from './favorites/favorites';
import { HelpPageView } from './help/help-page';
import { Home } from './home/home';
import { ProductDetail } from './product-detail/product-detail';

const http = provideHttpClient(withInterceptors([apiInterceptor, mockApiInterceptor]));

/**
 * Acessibilidade das telas da loja (axe-core): rótulos de campos e botões,
 * ARIA válido, ordem de títulos, textos alternativos, nomes de links.
 * Falhou? A mensagem diz a regra e o elemento.
 */
// O axe percorre a página inteira: com a suíte toda rodando em paralelo passa dos 5 s padrão.
describe('acessibilidade da loja (axe)', { timeout: 30_000 }, () => {
  beforeEach(() => localStorage.clear());

  const page = async (
    url: string,
    component: Type<unknown>,
    opts: { path?: string; who?: string; cart?: boolean } = {},
  ) => {
    const { fixture } = await renderAt(url, component, {
      path: opts.path,
      providers: [http],
      setup: () => {
        if (opts.who) loginAs(opts.who);
        if (opts.cart) {
          const asad = TestBed.inject(CatalogService).findBySlug('lattafa-asad')!;
          TestBed.inject(CartStore).add(asad, asad.variants[0]);
        }
      },
    });
    await settle(fixture);
    return a11yViolations(fixture.nativeElement);
  };

  it('header e rodapé', async () => {
    expect(
      await a11yViolations((await render(Header, { providers: [http] })).nativeElement),
    ).toEqual([]);
    TestBed.resetTestingModule();
    expect(await a11yViolations((await render(Footer)).nativeElement)).toEqual([]);
  });

  const screens: [
    string,
    string,
    Type<unknown>,
    { path?: string; who?: string; cart?: boolean }?,
  ][] = [
    ['home', '/', Home, { path: '' }],
    ['catálogo', '/produtos', Catalog],
    ['produto', '/produtos/lattafa-asad', ProductDetail, { path: 'produtos/:slug' }],
    ['carrinho', '/carrinho', Cart, { cart: true }],
    ['login', '/login', Login],
    ['esqueci a senha', '/esqueci-senha', ForgotPassword],
    ['checkout', '/finalizar-compra', Checkout, { who: 'customer', cart: true }],
    ['favoritos', '/favoritos', Favorites, { who: 'customer' }],
    ['minha conta', '/minha-conta', Account, { who: 'customer' }],
    ['meus pedidos', '/minha-conta/pedidos', Orders, { who: 'customer' }],
    [
      'pedido',
      '/minha-conta/pedidos/NP100231',
      OrderDetail,
      { path: 'minha-conta/pedidos/:numero', who: 'bia@email.com' },
    ],
    [
      'devolução',
      '/minha-conta/pedidos/NP100231/devolucao',
      ReturnRequestPage,
      { path: 'minha-conta/pedidos/:numero/devolucao', who: 'bia@email.com' },
    ],
    ['dados pessoais', '/minha-conta/dados', Profile, { who: 'customer' }],
    ['endereços', '/minha-conta/enderecos', Addresses, { who: 'customer' }],
    ['ajuda', '/ajuda/trocas-e-devolucoes', HelpPageView, { path: 'ajuda/:pagina' }],
    ['seja afiliado', '/seja-afiliado', AffiliateLanding],
  ];

  for (const [name, url, component, opts] of screens) {
    it(name, async () => {
      expect(await page(url, component, opts)).toEqual([]);
    });
  }
});
