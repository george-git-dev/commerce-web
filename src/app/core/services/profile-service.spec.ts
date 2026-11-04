import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { loginAs } from '../../../testing/test-helpers';
import { AUTH_MODE } from '../config/auth-mode';
import { apiInterceptor } from '../http/api-interceptor';
import { mockApiInterceptor } from '../http/mock-api-interceptor';
import { Profile, ProfileService } from './profile-service';

const ANA: Profile = {
  name: 'Ana Souza',
  email: 'ana@email.com',
  cpf: '***.444.444-**',
  phone: '11987654321',
};

describe('ProfileService (Dados pessoais)', () => {
  beforeEach(() => localStorage.clear());

  it('modo bff: busca no BFF de verdade (não cai no back falso)', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_MODE, useValue: 'bff' },
        provideHttpClient(withInterceptors([apiInterceptor, mockApiInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const loaded = firstValueFrom(TestBed.inject(ProfileService).load());
    const req = TestBed.inject(HttpTestingController).expectOne('/bff/me/profile');
    expect(req.request.method).toBe('GET');
    req.flush(ANA);
    expect(await loaded).toEqual(ANA);
  });

  it('modo bff: salvar manda só números (CPF nulo quando não informado)', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_MODE, useValue: 'bff' },
        provideHttpClient(withInterceptors([apiInterceptor, mockApiInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const saved = firstValueFrom(
      TestBed.inject(ProfileService).save({ name: 'Ana', phone: '(11) 98765-4321', cpf: '' }),
    );
    const req = TestBed.inject(HttpTestingController).expectOne('/bff/me/profile');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ phone: '11987654321', cpf: null });
    req.flush(ANA);
    expect(await saved).toEqual(ANA);
  });

  it('modo mock: erro da regra simulada chega como ApiError com a mensagem', async () => {
    loginAs('customer');
    const error = await firstValueFrom(
      TestBed.inject(ProfileService).save({ name: 'A', phone: '', cpf: '' }),
    ).catch((e) => e);
    expect(error.message).toBe('Informe seu nome.');
  });

  it('modo mock: monta do login simulado, com o CPF já mascarado', async () => {
    const auth = loginAs('customer');
    auth.completeCpf('529.982.247-25');
    const profile = await firstValueFrom(TestBed.inject(ProfileService).load());
    expect(profile.cpf).toBe('***.982.247-**');
    expect(profile.email).toBe('ana@email.com');
  });
});
