import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FailureSimulator } from './failure-simulator';
import { mockApiInterceptor } from './mock-api-interceptor';

describe('mock da API + simulador de falhas', () => {
  let http: HttpClient;
  let simulator: FailureSimulator;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([mockApiInterceptor])),
      ],
    });
    http = TestBed.inject(HttpClient);
    simulator = TestBed.inject(FailureSimulator);
  });

  it('sem simulação responde sucesso', async () => {
    expect(await firstValueFrom(http.post('/api/cart/items', {}))).toEqual({ ok: true });
  });

  it('cada falha responde como o back (ProblemDetail); offline sem corpo', async () => {
    const cases = [
      ['erro', 500, 'INTERNAL_ERROR'],
      ['sessao', 401, 'SESSION_EXPIRED'],
      ['limite', 429, 'RATE_LIMITED'],
      ['validacao', 422, 'CART_OUT_OF_STOCK'],
      ['offline', 0, undefined],
    ] as const;
    for (const [mode, status, code] of cases) {
      simulator.mode.set(mode);
      const error = await firstValueFrom(http.post('/api/orders', {})).catch((e) => e);
      expect(error.status).toBe(status);
      expect(error.error?.code).toBe(code);
    }
  });

  it('"lento" nunca responde (quem corta é o timeout do interceptor)', async () => {
    simulator.mode.set('lento');
    const result = await Promise.race([
      firstValueFrom(http.post('/api/orders', {})).then(() => 'respondeu'),
      new Promise((r) => setTimeout(() => r('sem resposta'), 500)),
    ]);
    expect(result).toBe('sem resposta');
  });

  it('chamada fora de /api/ passa direto', async () => {
    simulator.mode.set('erro');
    const result = await firstValueFrom(http.get('/assets/nao-existe.json')).catch((e) => e);
    expect(result.status).not.toBe(500);
  });

  it('simulador lê ?simular= e desliga', () => {
    expect(simulator.enabled).toBe(true);
    simulator.mode.set('erro');
    simulator.off();
    expect(simulator.mode()).toBeNull();
  });
});
