import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  a11yViolations,
  currentUrl,
  loginAs,
  screenProviders,
  settle,
} from '../../../../testing/test-helpers';
import { apiInterceptor } from '../../../core/http/api-interceptor';
import { mockApiInterceptor } from '../../../core/http/mock-api-interceptor';
import { CouponService } from '../../../core/services/coupon-service';
import { PromotionService } from '../../../core/services/promotion-service';
import { StorefrontContent } from '../../../core/services/storefront-content';
import { ADMIN_ROUTES } from '../admin.routes';
import { AdminCustomerStore } from '../services/admin-customer-store';
import { AdminOrderStore } from '../services/admin-order-store';

@Component({ template: '' })
class Blank {}

const http = provideHttpClient(withInterceptors([apiInterceptor, mockApiInterceptor]));

/** Id de um registro do mock (lido depois do login, já com o TestBed montado). */
const first = <T>(list: readonly T[], id: (item: T) => string | number) =>
  list.length ? String(id(list[0])) : 'sem-registro';

/**
 * Acessibilidade do backoffice (axe-core), com o layout do admin (menu e
 * topo) em volta de cada tela: rótulos de campos e botões, ARIA válido,
 * ordem de títulos, nomes de links. Contraste é conferido no navegador.
 */
describe('acessibilidade do backoffice (axe)', { timeout: 30_000 }, () => {
  // Pedidos fictícios do admin são sorteados pela data: data fixa = mesmas telas sempre.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 12, 15));
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  const page = async (url: string | (() => string)) => {
    TestBed.configureTestingModule({
      providers: [
        ...screenProviders([
          { path: 'admin', children: ADMIN_ROUTES },
          { path: '**', component: Blank },
        ]),
        http,
      ] as never[],
    });
    loginAs('superadmin');
    const target = typeof url === 'string' ? url : url();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(target);
    await settle(harness.fixture);
    // A tela abriu mesmo (não caiu num redirecionamento de guarda ou de "não encontrado").
    expect(currentUrl()).toBe(target);
    return a11yViolations(harness.fixture.nativeElement);
  };

  const screens: [string, string | (() => string)][] = [
    ['painel', '/admin'],
    ['pedidos', '/admin/pedidos'],
    [
      'detalhe do pedido',
      () => `/admin/pedidos/${first(TestBed.inject(AdminOrderStore).orders(), (o) => o.number)}`,
    ],
    ['devoluções', '/admin/pedidos/devolucoes'],
    ['produtos', '/admin/produtos'],
    ['novo produto', '/admin/produtos/novo'],
    ['editar produto', '/admin/produtos/lattafa-asad'],
    ['promoções', '/admin/promocoes'],
    ['nova promoção', '/admin/promocoes/nova'],
    [
      'editar promoção',
      () => `/admin/promocoes/${first(TestBed.inject(PromotionService).all(), (p) => p.id)}`,
    ],
    ['cupons', '/admin/promocoes/cupons'],
    ['novo cupom', '/admin/promocoes/cupons/novo'],
    [
      'editar cupom',
      () => `/admin/promocoes/cupons/${first(TestBed.inject(CouponService).all(), (c) => c.id)}`,
    ],
    ['estoque', '/admin/estoque'],
    ['movimento do SKU', '/admin/estoque/lattafa-asad-100'],
    ['entradas', '/admin/estoque/entradas'],
    ['nova entrada', '/admin/estoque/entradas/nova'],
    ['detalhe da entrada', '/admin/estoque/entradas/4'],
    ['fornecedores', '/admin/estoque/fornecedores'],
    ['novo fornecedor', '/admin/estoque/fornecedores/novo'],
    ['editar fornecedor', '/admin/estoque/fornecedores/2'],
    ['clientes', '/admin/clientes'],
    [
      'detalhe do cliente',
      () => `/admin/clientes/${first(TestBed.inject(AdminCustomerStore).customers(), (c) => c.id)}`,
    ],
    ['afiliados', '/admin/afiliados'],
    ['relatórios', '/admin/relatorios'],
    ['auditoria', '/admin/auditoria'],
    ['vitrine (banners)', '/admin/vitrine'],
    ['avaliações', '/admin/vitrine/avaliacoes'],
    ['avisos', '/admin/vitrine/avisos'],
    ['novo banner', '/admin/vitrine/banners/novo'],
    [
      'editar banner',
      () =>
        `/admin/vitrine/banners/${first(TestBed.inject(StorefrontContent).allBanners(), (b) => b.id)}`,
    ],
    ['configurações', '/admin/vitrine/configuracoes'],
  ];

  for (const [name, url] of screens) {
    it(name, async () => {
      expect(await page(url)).toEqual([]);
    });
  }
});
