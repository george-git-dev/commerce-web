import { InjectionToken } from '@angular/core';

/**
 * De onde vem a sessão:
 * - `bff`: login de verdade (Keycloak via commerce-bff-nani); a sessão fica no
 *   BFF e o navegador só tem o cookie HttpOnly;
 * - `mock`: login simulado, para mexer em tela sem subir Keycloak e BFF.
 */
export type AuthMode = 'bff' | 'mock';

/** O app usa o do `environment`; fora dele (testes) o padrão é o mock. */
export const AUTH_MODE = new InjectionToken<AuthMode>('AUTH_MODE', {
  providedIn: 'root',
  factory: () => 'mock',
});
