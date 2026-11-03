import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AUTH_MODE } from '../config/auth-mode';
import { ApiError } from '../http/api-errors';
import { apiInterceptor } from '../http/api-interceptor';
import { mockApiInterceptor } from '../http/mock-api-interceptor';
import { CepLookup } from './cep-lookup';
import { Notifier } from './notifier';

function setUpBff(): HttpTestingController {
  TestBed.configureTestingModule({
    providers: [
      { provide: AUTH_MODE, useValue: 'bff' },
      provideHttpClient(withInterceptors([apiInterceptor, mockApiInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
    ],
  });
  return TestBed.inject(HttpTestingController);
}

describe('CepLookup', () => {
  it('modo mock: preenche cidade/UF pela região do CEP', async () => {
    const lookup = TestBed.inject(CepLookup);
    expect(await firstValueFrom(lookup.lookup('20040-002'))).toEqual({
      street: 'Rua das Acácias',
      district: 'Centro',
      city: 'Rio de Janeiro',
      state: 'RJ',
    });
    expect((await firstValueFrom(lookup.lookup('90000000'))).state).toBe('RS');
  });

  it('modo bff: busca no BFF só com os números', async () => {
    const backend = setUpBff();
    const found = firstValueFrom(TestBed.inject(CepLookup).lookup('01310-100'));
    const req = backend.expectOne('/api/cep/01310100');
    expect(req.request.method).toBe('GET');
    req.flush({
      cep: '01310100',
      street: 'Avenida Paulista',
      district: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    });
    expect(await found).toEqual({
      street: 'Avenida Paulista',
      district: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    });
  });

  it('modo bff: CEP não encontrado traz a frase do back, sem aviso global nem nova tentativa', async () => {
    const backend = setUpBff();
    const notifier = TestBed.inject(Notifier);
    const error = vi.spyOn(notifier, 'error');
    const result = firstValueFrom(TestBed.inject(CepLookup).lookup('01310100')).catch((e) => e);
    backend
      .expectOne('/api/cep/01310100')
      .flush(
        {
          status: 404,
          code: 'CEP_NOT_FOUND',
          detail: 'Não encontramos esse CEP. Confira ou preencha o endereço.',
        },
        { status: 404, statusText: 'Not Found' },
      );
    const failure = (await result) as ApiError;
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure.message).toBe('Não encontramos esse CEP. Confira ou preencha o endereço.');
    expect(error).not.toHaveBeenCalled();
  });

  it('modo bff: serviço fora do ar (503) não repete a chamada nem mostra aviso global', async () => {
    const backend = setUpBff();
    const error = vi.spyOn(TestBed.inject(Notifier), 'error');
    const result = firstValueFrom(TestBed.inject(CepLookup).lookup('01310100')).catch((e) => e);
    backend
      .expectOne('/api/cep/01310100')
      .flush(
        {
          status: 503,
          code: 'SERVICE_UNAVAILABLE',
          detail: 'A busca de CEP está fora do ar agora. Preencha o endereço, por favor.',
        },
        { status: 503, statusText: 'Service Unavailable' },
      );
    expect(((await result) as ApiError).message).toContain('fora do ar');
    backend.verify();
    expect(error).not.toHaveBeenCalled();
  });
});
