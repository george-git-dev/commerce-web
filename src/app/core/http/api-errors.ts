import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

/** Tipo do erro, do ponto de vista de quem usa a loja. */
export type ApiErrorKind =
  | 'offline'
  | 'timeout'
  | 'server'
  | 'rate-limit'
  | 'session'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'unknown';

/**
 * Mensagens RESERVA do front. A regra é: **a mensagem vem do back** (`detail` do
 * `ProblemDetail`). Estas só aparecem quando o back não respondeu nada útil —
 * sem internet, timeout, back fora do ar (502/503 do balanceador, sem corpo) —
 * ou respondeu sem `detail` (falha de contrato, não deveria acontecer).
 */
export const API_ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  offline: 'Você está sem conexão. Confira a internet e tente de novo.',
  timeout: 'O servidor demorou para responder. Tente de novo em instantes.',
  server: 'Estamos com uma instabilidade. Tente de novo em instantes.',
  'rate-limit': 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.',
  session: 'Sua sessão expirou. Entre de novo para continuar.',
  forbidden: 'Você não tem permissão para fazer isso.',
  'not-found': 'Não encontramos o que você procurou.',
  validation: 'Confira os dados e tente de novo.',
  unknown: 'Algo deu errado. Tente de novo.',
};

/**
 * Corpo de erro do back (RFC 9457 `ProblemDetail`, padrão do Spring — B2).
 * `detail` é uma frase pronta para o cliente; `errors` traz os campos inválidos.
 */
export interface ProblemDetail {
  title?: string;
  /** Mensagem para o cliente, já em português — é ela que a tela mostra. */
  detail?: string;
  status?: number;
  /** Código estável da regra (ex.: `CART_OUT_OF_STOCK`) — para a tela decidir, nunca para exibir. */
  code?: string;
  /** Campo → mensagem (formulários). */
  errors?: Record<string, string>;
}

/** Erro de chamada ao back já traduzido (o que a tela recebe). */
export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    /** Código curto para o suporte achar no log do back (`X-Request-Id`). */
    readonly requestId: string,
    readonly problem?: ProblemDetail,
  ) {
    super(problem?.detail?.trim() || API_ERROR_MESSAGES[kind]);
    this.name = 'ApiError';
  }

  /** Código da regra vindo do back (ex.: `CART_OUT_OF_STOCK`). */
  get code(): string | undefined {
    return this.problem?.code;
  }

  /** A mensagem veio do back (e não da reserva do front)? */
  get fromServer(): boolean {
    return !!this.problem?.detail?.trim();
  }
}

/** Status HTTP → tipo do erro. */
export function errorKind(status: number): ApiErrorKind {
  if (status === 0) return 'offline';
  if (status === 401) return 'session';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 408 || status === 504) return 'timeout';
  if (status === 429) return 'rate-limit';
  if (status === 400 || status === 409 || status === 422) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}

/** Converte qualquer falha da chamada (HTTP, timeout, outra) em `ApiError`. */
export function toApiError(error: unknown, requestId: string): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof TimeoutError) return new ApiError('timeout', 0, requestId);
  if (error instanceof HttpErrorResponse) {
    const problem =
      error.error && typeof error.error === 'object' ? (error.error as ProblemDetail) : undefined;
    return new ApiError(errorKind(error.status), error.status, requestId, problem);
  }
  return new ApiError('unknown', 0, requestId);
}

/** Vale tentar de novo sozinho? Só falha passageira (rede, timeout, 502/503/504). */
export function isTransient(error: ApiError): boolean {
  return (
    error.kind === 'offline' || error.kind === 'timeout' || [502, 503, 504].includes(error.status)
  );
}

/**
 * Aviso global? Validação e "não encontrado" ficam com a tela (mensagem no
 * campo, página de 404); o resto aparece no aviso.
 */
export function showsGlobally(error: ApiError): boolean {
  return error.kind !== 'validation' && error.kind !== 'not-found';
}

/** Código curto e legível para o suporte (ex.: "7F3A9C21"). */
export function newRequestId(): string {
  const uuid =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
}
