import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AUTH_MODE } from '../config/auth-mode';
import { maskCpf } from '../utils/br-format';
import { AuthService } from './auth-service';

/**
 * Minha conta → Dados pessoais (`GET /api/me/profile` no BFF). O BFF junta nome e e-mail
 * (Keycloak) com CPF e celular (commerce-api).
 */
export interface Profile {
  name: string;
  email: string;
  /** Sempre mascarado (`***.982.247-**`): o CPF completo nunca chega ao navegador. `null` = ainda não informado. */
  cpf: string | null;
  /** Celular com DDD, só números (ex.: `11987654321`). `null` = não informado. */
  phone: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly auth = inject(AuthService);
  private readonly mode = inject(AUTH_MODE);
  /** Só o modo `bff` faz chamada HTTP (o simulado funciona sem `HttpClient` configurado). */
  private readonly http = this.mode === 'bff' ? inject(HttpClient) : null;

  /** Dados reais pelo BFF; no modo `mock` (testes e `start:mock`), do login simulado. */
  load(): Observable<Profile> {
    if (this.http) return this.http.get<Profile>('/api/me/profile');
    const user = this.auth.user();
    return of({
      name: user?.name ?? '',
      email: user?.email ?? '',
      cpf: user?.cpf ? maskCpf(user.cpf) : null,
      phone: user?.phone ?? null,
    });
  }
}
