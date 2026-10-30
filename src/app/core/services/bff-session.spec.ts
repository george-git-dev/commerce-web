import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AUTH_MODE } from '../config/auth-mode';
import { loginPageGuard } from '../guards/auth-guard';
import { apiInterceptor } from '../http/api-interceptor';
import { FailureSimulator } from '../http/failure-simulator';
import { mockApiInterceptor } from '../http/mock-api-interceptor';
import { AuthService } from './auth-service';
import { BffSession } from './bff-session';
import { Notifier } from './notifier';

@Component({ template: '' })
class Blank {}

const ANA = {
  authenticated: true,
  user: {
    id: 'fc8679bf',
    name: 'Ana Souza',
    email: 'ana@email.com',
    roles: ['ROLE_CUSTOMER', 'ROLE_DESCONHECIDO'],
    permissions: ['shop:checkout'],
  },
};
const ANONIMO = { authenticated: false, user: null };

describe('login de verdade (modo bff)', () => {
  let auth: AuthService;
  let backend: HttpTestingController;
  let visited: string[];
  let notified: string[];

  beforeEach(() => {
    localStorage.clear();
    visited = [];
    notified = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_MODE, useValue: 'bff' },
        provideHttpClient(withInterceptors([apiInterceptor, mockApiInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: Blank }]),
        { provide: Notifier, useValue: { error: (m: string) => notified.push(m) } },
      ],
    });
    vi.spyOn(TestBed.inject(BffSession), 'go').mockImplementation((url) => visited.push(url));
    auth = TestBed.inject(AuthService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  /** Abre o site com o BFF respondendo `/api/auth/session`. */
  const open = async (respond: (req: ReturnType<typeof backend.expectOne>) => void) => {
    const started = auth.init();
    respond(backend.expectOne('/api/auth/session'));
    await started;
  };

  it('ao abrir o site, entra com o usuário do BFF (só papéis que a loja conhece)', async () => {
    await open((req) => req.flush(ANA));
    expect(auth.user()).toEqual({
      name: 'Ana Souza',
      email: 'ana@email.com',
      roles: ['ROLE_CUSTOMER'],
    });
    expect(auth.can('shop:checkout')).toBe(true);
    expect(auth.isStaff()).toBe(false);
  });

  it('anônimo (200 sem usuário): fica deslogado, sem aviso e sem ir para o login', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/produtos');
    await open((req) => req.flush(ANONIMO));
    expect(auth.isLoggedIn()).toBe(false);
    expect(notified).toEqual([]);
    expect(router.url).toBe('/produtos');
  });

  it('BFF fora do ar: abre deslogado, sem aviso', async () => {
    await open((req) => req.flush(null, { status: 502, statusText: 'Bad Gateway' }));
    expect(auth.isLoggedIn()).toBe(false);
    expect(notified).toEqual([]);
  });

  it('não lê nem guarda a sessão no navegador (limpa o que o mock deixou)', async () => {
    localStorage.setItem('nani.auth.mock', JSON.stringify({ name: 'Velho', email: 'v@email.com' }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: AUTH_MODE, useValue: 'bff' }] });
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
    expect(localStorage.getItem('nani.auth.mock')).toBeNull();
    backend = { verify: () => undefined } as never;
  });

  it('entrar e criar conta levam ao BFF com o caminho de volta', () => {
    auth.startLogin('/finalizar-compra?etapa=2');
    auth.startRegister('/minha-conta');
    expect(visited).toEqual([
      '/api/auth/login?returnTo=%2Ffinalizar-compra%3Fetapa%3D2',
      '/api/auth/register?returnTo=%2Fminha-conta',
    ]);
  });

  it('sair: POST no BFF e segue para o logout do Keycloak', async () => {
    await open((req) => req.flush(ANA));
    auth.logout();
    expect(auth.isLoggedIn()).toBe(false);
    const req = backend.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush({ redirectUrl: 'http://localhost:8180/auth/realms/nani/logout?x=1' });
    await vi.waitFor(() =>
      expect(visited).toEqual(['http://localhost:8180/auth/realms/nani/logout?x=1']),
    );
  });

  it('sair com o BFF fora do ar: volta para o início, sem aviso', async () => {
    auth.logout();
    backend.expectOne('/api/auth/logout').flush(null, { status: 500, statusText: 'Erro' });
    await vi.waitFor(() => expect(visited).toEqual(['/']));
    expect(notified).toEqual([]);
  });

  it('sessão expirada em outra chamada: limpa aqui e vai para o login, sem chamar o logout do BFF', async () => {
    await open((req) => req.flush(ANA));
    TestBed.inject(FailureSimulator).mode.set('sessao');
    const failed = await firstValueFrom(TestBed.inject(HttpClient).post('/api/orders', {})).catch(
      () => 'erro',
    );
    expect(failed).toBe('erro');
    expect(auth.isLoggedIn()).toBe(false);
    expect(notified).toEqual(['Sua sessão expirou. Entre de novo para continuar.']);
    backend.expectNone('/api/auth/logout');
  });

  describe('telas de login', () => {
    const run = (url: string) => {
      const route = new ActivatedRouteSnapshot();
      const [, query = ''] = url.split('?');
      (route as { queryParams: object }).queryParams = Object.fromEntries(
        new URLSearchParams(query),
      );
      return TestBed.runInInjectionContext(() => loginPageGuard(route, {} as RouterStateSnapshot));
    };

    it('deslogado: vai direto para o Keycloak levando o retorno (seguro)', () => {
      expect(run('/login?retorno=/carrinho')).toBe(false);
      expect(run('/login?retorno=//site-falso.com')).toBe(false);
      expect(visited).toEqual([
        '/api/auth/login?returnTo=%2Fcarrinho',
        '/api/auth/login?returnTo=%2Fminha-conta',
      ]);
    });

    it('já logado: volta para onde ia', async () => {
      await open((req) => req.flush(ANA));
      expect(String(run('/login?retorno=/carrinho'))).toBe('/carrinho');
      expect(visited).toEqual([]);
    });

    it('modo mock: abre a tela simulada', () => {
      TestBed.resetTestingModule();
      expect(run('/login')).toBe(true);
      backend = { verify: () => undefined } as never;
    });
  });
});
