import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { AUTH_MODE } from '../config/auth-mode';
import { ApiError } from '../http/api-errors';
import { maskCpf, onlyDigits } from '../utils/br-format';
import { AuthService } from './auth-service';

/**
 * Minha conta → Dados pessoais (`GET /bff/me/profile` no BFF). O BFF junta nome e e-mail
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

/** O que a tela manda salvar. Nome só no modo simulado (no login de verdade, é no Keycloak). */
export interface ProfileChanges {
  name: string;
  /** Como digitado, com ou sem máscara; vazio apaga. */
  phone: string;
  /** Só quando a conta ainda não tem CPF; vazio = não mexe. */
  cpf: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly auth = inject(AuthService);
  private readonly mode = inject(AUTH_MODE);
  /** Só o modo `bff` faz chamada HTTP (o simulado funciona sem `HttpClient` configurado). */
  private readonly http = this.mode === 'bff' ? inject(HttpClient) : null;

  /** Dados reais pelo BFF; no modo `mock` (testes e `start:mock`), do login simulado. */
  load(): Observable<Profile> {
    if (this.http) return this.http.get<Profile>('/bff/me/profile');
    const user = this.auth.user();
    return of({
      name: user?.name ?? '',
      email: user?.email ?? '',
      cpf: user?.cpf ? maskCpf(user.cpf) : null,
      phone: user?.phone ?? null,
    });
  }

  /**
   * Salva celular e CPF (`PATCH /bff/me/profile`) e devolve os dados atualizados. Erro do back
   * (CPF em outra conta, campo inválido…) chega como `ApiError`, com a mensagem pronta.
   */
  save(changes: ProfileChanges): Observable<Profile> {
    if (this.http) {
      return this.http.patch<Profile>('/bff/me/profile', {
        phone: onlyDigits(changes.phone),
        cpf: changes.cpf ? onlyDigits(changes.cpf) : null,
      });
    }
    if (changes.cpf) {
      const result = this.auth.completeCpf(changes.cpf);
      if (!result.ok) return throwError(() => simulatedError(result.message));
    }
    const result = this.auth.updateProfile(changes.name, changes.phone);
    return result.ok ? this.load() : throwError(() => simulatedError(result.message));
  }
}

/** Erro do modo simulado no mesmo formato do back (mensagem no `detail`). */
function simulatedError(detail: string): ApiError {
  return new ApiError('validation', 400, 'SIMULADO', { detail });
}
