import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, retry, throwError, timeout, timer } from 'rxjs';
import { AuthService } from '../services/auth-service';
import { Notifier } from '../services/notifier';
import { NO_RETRY, REQUEST_TIMEOUT, SKIP_GLOBAL_ERROR } from './api-context';
import {
  API_ERROR_MESSAGES,
  isTransient,
  newRequestId,
  showsGlobally,
  toApiError,
} from './api-errors';

/** Prefixo das chamadas ao nosso back (Fase 2: mesmo domínio, via CloudFront → API). */
export const API_PREFIX = '/api/';

/**
 * Proteção global das chamadas ao back:
 * - `X-Request-Id` em toda chamada (o back grava no log; o cliente informa no suporte);
 * - timeout (15 s) — nada fica "carregando para sempre";
 * - nova tentativa automática só em leitura (GET) e só em falha passageira —
 *   nunca em POST/PUT/PATCH/DELETE (não duplica pedido nem pagamento);
 * - erro vira `ApiError` com mensagem amigável; aviso global, menos validação e
 *   404 (a tela trata) e quando a tela pediu `SKIP_GLOBAL_ERROR`;
 * - 401: sessão expirada → sai e vai para o login, voltando para a mesma página.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_PREFIX)) return next(req);
  const notifier = inject(Notifier);
  const auth = inject(AuthService);
  const router = inject(Router);
  const requestId = newRequestId();
  const canRetry = req.method === 'GET' && !req.context.get(NO_RETRY);

  return next(req.clone({ setHeaders: { 'X-Request-Id': requestId } })).pipe(
    // `each`, não `first`: o HttpClient emite "enviado" na hora; o prazo tem que
    // valer até a resposta (e entre eventos de progresso, num upload).
    timeout({ each: req.context.get(REQUEST_TIMEOUT) }),
    retry({
      count: canRetry ? 2 : 0,
      delay: (error, attempt) =>
        isTransient(toApiError(error, requestId)) ? timer(500 * attempt) : throwError(() => error),
    }),
    catchError((error: unknown) => {
      const apiError = toApiError(error, requestId);
      if (apiError.kind === 'session') {
        auth.logout();
        notifier.error(API_ERROR_MESSAGES.session);
        const current = router.url;
        if (!current.startsWith('/login')) {
          router.navigate(['/login'], { queryParams: { retorno: current } });
        }
      } else if (!req.context.get(SKIP_GLOBAL_ERROR) && showsGlobally(apiError)) {
        notifier.error(apiError.message, apiError.requestId);
      }
      return throwError(() => apiError);
    }),
  );
};
