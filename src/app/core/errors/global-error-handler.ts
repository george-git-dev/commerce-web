import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, inject, Injectable, Injector } from '@angular/core';
import { ApiError } from '../http/api-errors';
import { Notifier } from '../services/notifier';

/**
 * Erro de código no front que ninguém tratou (não do back — esses o
 * interceptor já avisou): registra e mostra um aviso genérico, sem tela quebrada
 * em silêncio. Pós-MVP: enviar para um monitoramento (ex.: Sentry), sem dado pessoal.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);

  handleError(error: unknown): void {
    const cause = (error as { rejection?: unknown })?.rejection ?? error;
    // Chamada ao back: o aviso já foi dado pelo interceptor.
    if (cause instanceof ApiError || cause instanceof HttpErrorResponse) return;
    console.error(error);
    if (typeof window === 'undefined') return; // servidor (pré-renderização): só o registro
    try {
      this.injector
        .get(Notifier)
        .error('Algo deu errado nesta tela. Recarregue a página e tente de novo.');
    } catch {
      // Sem como avisar (ex.: erro durante a inicialização): fica só o registro.
    }
  }
}
