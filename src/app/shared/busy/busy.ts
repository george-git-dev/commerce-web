import { signal } from '@angular/core';
import { finalize, Observable, take } from 'rxjs';
import { ApiError } from '../../core/http/api-errors';

/**
 * Estado "ocupado" de uma ação (botão desabilitado + "Aguarde…"): impede clicar
 * de novo enquanto a chamada não termina e sempre volta ao normal — com sucesso,
 * erro ou timeout. O aviso de erro já vem do interceptor; `onError` é para a
 * tela reagir (ex.: mensagem no campo).
 */
export class Busy {
  readonly running = signal(false);

  run<T>(
    work: Observable<T>,
    onSuccess: (value: T) => void,
    onError?: (error: ApiError) => void,
  ): void {
    if (this.running()) return;
    this.running.set(true);
    work
      .pipe(
        take(1),
        finalize(() => this.running.set(false)),
      )
      .subscribe({
        next: onSuccess,
        error: (error: unknown) => {
          if (error instanceof ApiError) onError?.(error);
          else throw error;
        },
      });
  }
}
