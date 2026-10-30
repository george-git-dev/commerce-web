import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Role, ROLE_PERMISSIONS } from '../config/permissions';
import { NO_RETRY, REQUEST_TIMEOUT, SKIP_GLOBAL_ERROR } from '../http/api-context';
import { AuthUser } from '../models/auth';

/** Rotas do BFF que não passam pelo back falso (`mockApiInterceptor`). */
export const BFF_PATHS = ['/api/auth/'] as const;

/** A abertura do site espera o `/api/me`: prazo curto para não travar a primeira tela. */
export const SESSION_CHECK_TIMEOUT_MS = 5_000;

/** Resposta de `GET /api/auth/session` (commerce-bff-nani, `SessaoResponse`). */
interface SessionResponse {
  authenticated: boolean;
  user: { id: string; name: string; email: string; roles: string[]; permissions: string[] } | null;
}

/**
 * Conversa com o commerce-bff-nani. Login, cadastro e logout acontecem no
 * BFF/Keycloak (a página inteira sai da SPA); os tokens ficam no BFF e o
 * navegador só tem o cookie de sessão HttpOnly e o `XSRF-TOKEN` (o
 * HttpClient manda o `X-XSRF-TOKEN` sozinho nos POST).
 */
@Injectable({ providedIn: 'root' })
export class BffSession {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  /**
   * Quem está logado (ou `null`: anônimo, BFF fora do ar ou prazo esgotado). O BFF
   * responde sempre 200 — visitante anônimo não é erro (401 fica para rota protegida).
   */
  async me(): Promise<AuthUser | null> {
    const context = new HttpContext()
      .set(SKIP_GLOBAL_ERROR, true)
      .set(NO_RETRY, true)
      .set(REQUEST_TIMEOUT, SESSION_CHECK_TIMEOUT_MS);
    try {
      const { user } = await firstValueFrom(
        this.http.get<SessionResponse>('/api/auth/session', { context }),
      );
      return user ? { name: user.name, email: user.email, roles: knownRoles(user.roles) } : null;
    } catch {
      return null;
    }
  }

  /** Tela de login do Keycloak; depois volta para `returnTo` (caminho interno). */
  login(returnTo: string): void {
    this.go(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  /** Tela de criar conta do Keycloak; depois volta para `returnTo`. */
  register(returnTo: string): void {
    this.go(`/api/auth/register?returnTo=${encodeURIComponent(returnTo)}`);
  }

  /**
   * Encerra a sessão no BFF e depois no Keycloak (`redirectUrl` = end-session,
   * que volta para a loja). Se o BFF não responder, volta para o início.
   */
  async logout(): Promise<void> {
    const context = new HttpContext().set(SKIP_GLOBAL_ERROR, true);
    try {
      const { redirectUrl } = await firstValueFrom(
        this.http.post<{ redirectUrl: string }>('/api/auth/logout', null, { context }),
      );
      this.go(redirectUrl);
    } catch {
      this.go('/');
    }
  }

  /** Sai da SPA (navegação de página inteira). Separado para os testes. */
  go(url: string): void {
    this.document.location.assign(url);
  }
}

/** Só os papéis que a loja conhece (um papel novo no Keycloak não quebra a tela). */
function knownRoles(roles: readonly string[] | null | undefined): Role[] {
  return (roles ?? []).filter((role): role is Role => role in ROLE_PERMISSIONS);
}
