import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { Busy } from '../../shared/busy/busy';
import { AuthService } from '../services/auth-service';
import { Notifier } from '../services/notifier';
import { REQUEST_TIMEOUT, SKIP_GLOBAL_ERROR } from './api-context';
import { ApiError, errorKind, isTransient, newRequestId, toApiError } from './api-errors';
import { apiInterceptor } from './api-interceptor';

describe('proteção global das chamadas ao back', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let notified: string[];

  beforeEach(() => {
    localStorage.clear();
    notified = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
        {
          provide: Notifier,
          useValue: { error: (m: string) => notified.push(m), success: () => {} },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('traduz status em tipo e mensagem', () => {
    expect(errorKind(0)).toBe('offline');
    expect(errorKind(401)).toBe('session');
    expect(errorKind(422)).toBe('validation');
    expect(errorKind(503)).toBe('server');
    expect(isTransient(new ApiError('server', 503, 'X'))).toBe(true);
    expect(isTransient(new ApiError('server', 500, 'X'))).toBe(false);
    expect(newRequestId()).toMatch(/^[0-9A-F]{8}$/);
    expect(toApiError(new Error('x'), 'AB').kind).toBe('unknown');
  });

  it('manda X-Request-Id e avisa erro de servidor com o código', async () => {
    const result = firstValueFrom(http.post('/api/orders', {})).catch((e) => e);
    const req = backend.expectOne('/api/orders');
    const id = req.request.headers.get('X-Request-Id');
    expect(id).toMatch(/^[0-9A-F]{8}$/);
    req.flush(null, { status: 500, statusText: 'Erro' });
    const error = (await result) as ApiError;
    expect(error.kind).toBe('server');
    expect(error.requestId).toBe(id);
    expect(notified).toHaveLength(1);
  });

  it('POST nunca é repetido sozinho (não duplica pedido)', async () => {
    const result = firstValueFrom(http.post('/api/orders', {})).catch((e) => e);
    backend.expectOne('/api/orders').flush(null, { status: 503, statusText: 'Indisponível' });
    backend.expectNone('/api/orders');
    expect(((await result) as ApiError).status).toBe(503);
  });

  it('GET tenta de novo em falha passageira e segue se o back voltar', async () => {
    const result = firstValueFrom(http.get('/api/products'));
    backend.expectOne('/api/products').flush(null, { status: 503, statusText: 'Indisponível' });
    await new Promise((r) => setTimeout(r, 600));
    backend.expectOne('/api/products').flush({ ok: true });
    expect(await result).toEqual({ ok: true });
    expect(notified).toHaveLength(0);
  });

  it('validação fica com a tela; SKIP_GLOBAL_ERROR silencia o aviso', async () => {
    const a = firstValueFrom(http.post('/api/cart/items', {})).catch((e) => e);
    backend
      .expectOne('/api/cart/items')
      .flush({ detail: 'Este tamanho acabou de esgotar.' }, { status: 422, statusText: 'x' });
    expect(((await a) as ApiError).message).toBe('Este tamanho acabou de esgotar.');
    const b = firstValueFrom(
      http.post('/api/orders', {}, { context: new HttpContext().set(SKIP_GLOBAL_ERROR, true) }),
    ).catch((e) => e);
    backend.expectOne('/api/orders').flush(null, { status: 500, statusText: 'x' });
    await b;
    expect(notified).toHaveLength(0);
  });

  it('mostra a mensagem do back; reserva do front só sem resposta útil', async () => {
    const a = firstValueFrom(http.post('/api/orders', {})).catch((e) => e);
    backend
      .expectOne('/api/orders')
      .flush(
        { code: 'INTERNAL_ERROR', detail: 'Mensagem configurada no back.' },
        { status: 500, statusText: 'x' },
      );
    const error = (await a) as ApiError;
    expect(error.message).toBe('Mensagem configurada no back.');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.fromServer).toBe(true);
    expect(notified[0]).toContain('Mensagem configurada no back.');
  });

  it('401: sai da conta e avisa que a sessão expirou', async () => {
    const auth = TestBed.inject(AuthService);
    auth.login('ana@email.com', '12345678');
    const result = firstValueFrom(http.post('/api/orders', {})).catch((e) => e);
    backend.expectOne('/api/orders').flush(null, { status: 401, statusText: 'x' });
    await result;
    expect(auth.user()).toBeNull();
    expect(notified[0]).toContain('sessão expirou');
  });

  it('timeout: não fica esperando para sempre', async () => {
    const result = firstValueFrom(
      http.post('/api/orders', {}, { context: new HttpContext().set(REQUEST_TIMEOUT, 20) }),
    ).catch((e) => e);
    backend.expectOne('/api/orders');
    const error = (await Promise.race([
      result,
      new Promise((r) => setTimeout(() => r('hang'), 1000)),
    ])) as ApiError;
    expect(error.kind).toBe('timeout');
    expect(notified[0]).toContain('demorou');
  });

  it('botão ocupado volta ao normal com erro (e não aceita clique repetido)', () => {
    const busy = new Busy();
    let errors = 0;
    busy.run(
      throwError(() => new ApiError('server', 500, 'X')),
      () => {},
      () => errors++,
    );
    expect(busy.running()).toBe(false);
    expect(errors).toBe(1);
    let calls = 0;
    busy.running.set(true);
    busy.run(of(1), () => calls++);
    expect(calls).toBe(0);
  });
});
