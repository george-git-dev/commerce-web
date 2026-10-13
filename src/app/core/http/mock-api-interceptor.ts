import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { delay, mergeMap, NEVER, of, throwError, timer } from 'rxjs';
import { API_PREFIX } from './api-interceptor';
import { FailureSimulator } from './failure-simulator';

const STATUS = { erro: 500, offline: 0, sessao: 401, limite: 429, validacao: 422 } as const;

/**
 * Back FALSO (Fase 1): responde às chamadas `/api/...` com sucesso depois de um
 * pequeno atraso — ou com a falha que o `FailureSimulator` mandar. Fica por
 * último na cadeia, para timeout/nova tentativa/avisos valerem como no back real.
 * Fase 2: sai daqui e as chamadas vão para o Spring.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_PREFIX)) return next(req);
  const mode = inject(FailureSimulator).mode();
  if (!mode) return of(new HttpResponse({ status: 200, body: { ok: true } })).pipe(delay(350));
  if (mode === 'lento') return NEVER;
  const status = STATUS[mode];
  return timer(350).pipe(
    mergeMap(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status,
            url: req.url,
            error:
              mode === 'validacao'
                ? { status, title: 'Unprocessable', detail: 'Este tamanho acabou de esgotar.' }
                : null,
          }),
      ),
    ),
  );
};
