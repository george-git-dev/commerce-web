import { registerLocaleData } from '@angular/common';
import ptBr from '@angular/common/locales/pt';
import { Component, LOCALE_ID, provideZonelessChangeDetection, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Product } from '../app/core/models/product';
import { AuthService } from '../app/core/services/auth-service';
import { MOCK_PRODUCTS } from '../app/core/data/mock-products';

registerLocaleData(ptBr);

/**
 * Contas de teste (qualquer senha 8+). Mesmas dos mocks — ver
 * `core/data/customers-mock.ts` e `core/data/affiliates-mock.ts`.
 */
export const ACCOUNTS = {
  superadmin: 'superadmin@email.com',
  admin: 'admin@email.com',
  viewer: 'viewer@email.com',
  customer: 'ana@email.com',
  affiliate: 'julia.afiliada@email.com',
  inHands: 'vizinho@email.com',
} as const;

export const PASSWORD = '12345678';

/** Entra com uma conta de teste (sai da anterior). */
export function loginAs(account: keyof typeof ACCOUNTS | string): AuthService {
  const auth = TestBed.inject(AuthService);
  auth.logout();
  const email = account in ACCOUNTS ? ACCOUNTS[account as keyof typeof ACCOUNTS] : account;
  const result = auth.login(email, PASSWORD);
  if (!result.ok) throw new Error(`Login de teste falhou: ${email}`);
  return auth;
}

/**
 * Produto do catálogo mock pelo slug (falha alto se não existir). Lê o mock
 * direto (sem TestBed), então pode ser usado antes de `render`.
 */
export function productBySlug(slug: string): Product {
  const product = MOCK_PRODUCTS.find((item) => item.slug === slug);
  if (!product) throw new Error(`Produto de teste não encontrado: ${slug}`);
  return product;
}

/** Providers comuns para testar componente de tela. */
export function screenProviders(routes: Routes = [{ path: '**', children: [] }]) {
  return [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    // Como no app: moeda e datas em português (R$ 14,90; 12/10/2026).
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ];
}

/**
 * Monta um componente com os providers comuns, aplica os inputs e renderiza.
 * Ex.: `const f = await render(EmptyState, { inputs: { icon: 'x', title: 'Vazio' } })`.
 */
export async function render<T>(
  component: Type<T>,
  options: {
    inputs?: Record<string, unknown>;
    providers?: unknown[];
    routes?: Routes;
  } = {},
): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [...screenProviders(options.routes), ...(options.providers ?? [])] as never[],
  });
  const fixture = TestBed.createComponent(component);
  for (const [name, value] of Object.entries(options.inputs ?? {})) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

/** Texto visível do componente, com espaços normalizados. */
export function textOf(fixture: ComponentFixture<unknown>): string {
  return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

/** Elemento por seletor (falha alto se não achar). */
export function $(fixture: ComponentFixture<unknown>, selector: string): HTMLElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Elemento não encontrado: ${selector}`);
  return element;
}

/** Todos os elementos por seletor. */
export function $$(fixture: ComponentFixture<unknown>, selector: string): HTMLElement[] {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(selector));
}

/** Botão pelo texto visível. */
export function buttonByText(
  fixture: ComponentFixture<unknown>,
  text: string | RegExp,
): HTMLButtonElement {
  const match = (value: string) =>
    typeof text === 'string' ? value.includes(text) : text.test(value);
  const button = $$(fixture, 'button, a').find((el) => match(el.textContent?.trim() ?? ''));
  if (!button) throw new Error(`Botão não encontrado: ${text}`);
  return button as HTMLButtonElement;
}

/** Digita num campo (dispara `input`, como o usuário). */
export function type(element: HTMLElement, value: string): void {
  (element as HTMLInputElement).value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Detecta mudanças e espera estabilizar (zoneless). */
export async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Página vazia para as outras rotas do teste (destino de navegação). */
@Component({ template: '<p id="outra-pagina">outra página</p>' })
export class BlankPage {}

/**
 * Abre um componente de tela numa URL de verdade (com query params), como o
 * usuário chegaria. `path` é o caminho da rota do componente (padrão: o da URL).
 * Outras URLs caem numa página vazia — dá para conferir para onde navegou.
 */
export async function renderAt<T>(
  url: string | (() => string),
  component: Type<T>,
  options: {
    path?: string;
    providers?: unknown[];
    extraRoutes?: Routes;
    /** Roda depois de configurar o TestBed e antes de abrir a página (ex.: login, dados). */
    setup?: () => void;
  } = {},
) {
  const first = typeof url === 'string' ? url : '';
  const path = options.path ?? first.split('?')[0].replace(/^\//, '');
  TestBed.configureTestingModule({
    providers: [
      ...screenProviders([
        { path, component },
        ...(options.extraRoutes ?? []),
        { path: '**', component: BlankPage },
      ]),
      ...(options.providers ?? []),
    ] as never[],
  });
  options.setup?.();
  const harness = await RouterTestingHarness.create();
  const instance = await harness.navigateByUrl(typeof url === 'string' ? url : url(), component);
  harness.detectChanges();
  await harness.fixture.whenStable();
  return { harness, instance, fixture: harness.fixture, router: TestBed.inject(Router) };
}

/** URL atual do roteador (para conferir navegação). */
export function currentUrl(): string {
  return TestBed.inject(Router).url;
}
