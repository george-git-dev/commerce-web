import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { delay, mergeMap, NEVER, of, throwError, timer } from 'rxjs';
import { BFF_PATHS } from '../services/bff-session';
import { API_PREFIX } from './api-interceptor';
import { FailureSimulator } from './failure-simulator';

const STATUS = { erro: 500, offline: 0, sessao: 401, limite: 429, validacao: 422 } as const;

/**
 * O que o back (Spring) responde em cada caso — `ProblemDetail` com a mensagem
 * pronta. "offline" não tem corpo (a chamada nem chegou ao back): o front usa a reserva.
 */
const BACK_PROBLEMS: Record<Exclude<keyof typeof STATUS, 'offline'>, object> = {
  erro: {
    code: 'INTERNAL_ERROR',
    detail: 'Não conseguimos concluir agora. Tente de novo em alguns instantes.',
  },
  sessao: { code: 'SESSION_EXPIRED', detail: 'Sua sessão expirou. Entre de novo para continuar.' },
  limite: {
    code: 'RATE_LIMITED',
    detail: 'Você fez muitas tentativas seguidas. Aguarde um minuto e tente de novo.',
  },
  validacao: { code: 'CART_OUT_OF_STOCK', detail: 'Este tamanho acabou de esgotar.' },
};

/**
 * Back FALSO (Fase 1): responde às chamadas `/api/...` com sucesso depois de um
 * pequeno atraso — ou com a falha que o `FailureSimulator` mandar. Fica por
 * último na cadeia, para timeout/nova tentativa/avisos valerem como no back real.
 * Fase 2: sai daqui e as chamadas vão para o Spring. Sessão e login (`BFF_PATHS`)
 * já vão para o BFF de verdade.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_PREFIX)) return next(req);
  if (BFF_PATHS.some((path) => req.url.startsWith(path))) return next(req);
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
            error: mode === 'offline' ? null : { status, ...BACK_PROBLEMS[mode] },
          }),
      ),
    ),
  );
};
