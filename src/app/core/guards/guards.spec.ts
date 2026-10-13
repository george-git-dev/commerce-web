import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { loginAs, productBySlug } from '../../../testing/test-helpers';
import { CartStore } from '../services/cart-store';
import { authGuard, safeReturnUrl } from './auth-guard';
import { cartNotEmptyGuard } from './cart-guard';
import { customerGuard, permissionGuard, staffGuard } from './role-guard';

const run = (guard: typeof authGuard, url = '/minha-conta') =>
  TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
const urlOf = (result: unknown) => (result instanceof UrlTree ? result.toString() : result);

describe('guards de rota', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('authGuard: sem login vai para o login com a página de volta', () => {
    expect(urlOf(run(authGuard, '/minha-conta/pedidos'))).toBe(
      '/login?retorno=%2Fminha-conta%2Fpedidos',
    );
    loginAs('customer');
    expect(run(authGuard)).toBe(true);
  });

  it('safeReturnUrl: só aceita caminho interno (sem redirecionamento aberto)', () => {
    expect(safeReturnUrl('/carrinho')).toBe('/carrinho');
    expect(safeReturnUrl('//evil.com')).toBe('/minha-conta');
    expect(safeReturnUrl('/\\evil.com')).toBe('/minha-conta');
    expect(safeReturnUrl('https://evil.com')).toBe('/minha-conta');
    expect(safeReturnUrl(null, '/')).toBe('/');
  });

  it('cartNotEmptyGuard: checkout só com algo na sacola', () => {
    expect(urlOf(run(cartNotEmptyGuard))).toBe('/carrinho');
    const asad = productBySlug('lattafa-asad');
    TestBed.inject(CartStore).add(asad, asad.variants[0]);
    expect(run(cartNotEmptyGuard)).toBe(true);
  });

  it('permissionGuard: sem login → login; sem permissão → volta; com permissão → entra', () => {
    const guard = permissionGuard('orders:edit', '/admin');
    expect(urlOf(run(guard, '/admin/pedidos'))).toBe('/login?retorno=%2Fadmin%2Fpedidos');
    loginAs('viewer');
    expect(urlOf(run(guard))).toBe('/admin');
    loginAs('admin');
    expect(run(guard)).toBe(true);
  });

  it('staffGuard e customerGuard', () => {
    loginAs('customer');
    expect(urlOf(run(staffGuard))).toBe('/');
    expect(run(customerGuard)).toBe(true);
    loginAs('viewer');
    expect(run(staffGuard)).toBe(true);
  });
});
