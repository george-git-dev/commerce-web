import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

/** Nome do query param com a página para voltar depois do login. */
export const RETURN_URL_PARAM = 'retorno';

/**
 * Rotas que exigem conta (Minha conta, checkout). Sem login, manda para
 * `/login?retorno=<url>` e o login devolve o cliente para onde ele estava.
 * No front é só experiência: quem protege os dados de verdade é o back.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/login'], {
    queryParams: { [RETURN_URL_PARAM]: state.url },
  });
};

/**
 * Só aceita caminho interno ("/x"). Bloqueia redirecionamento aberto para outro
 * site: "//x", "/\\x" (o navegador trata como "//x") e "https://x".
 */
export function safeReturnUrl(value: string | null, fallback = '/minha-conta'): string {
  const internal = !!value && value.startsWith('/') && !/^\/[\/\\]/.test(value);
  return internal ? value : fallback;
}
