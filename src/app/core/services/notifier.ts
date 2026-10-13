import { inject, Injectable, Injector } from '@angular/core';

/** Mesma mensagem dentro deste intervalo não aparece de novo (evita avisos em cascata). */
const DEDUPE_MS = 4000;

/**
 * Avisos rápidos para quem usa a loja/backoffice (snackbar). Erros mostram o
 * código da chamada para o suporte achar no log do back. O snackbar do Material
 * é carregado só no primeiro aviso (fora do carregamento inicial da loja).
 */
@Injectable({ providedIn: 'root' })
export class Notifier {
  private readonly injector = inject(Injector);
  private last = { text: '', at: 0 };

  success(message: string): void {
    this.show(message, 3000);
  }

  error(message: string, requestId?: string): void {
    this.show(requestId ? `${message} Código: ${requestId}.` : message, 6000, 'snack--error');
  }

  private show(text: string, duration: number, panelClass?: string): void {
    const now = Date.now();
    if (text === this.last.text && now - this.last.at < DEDUPE_MS) return;
    this.last = { text, at: now };
    import('@angular/material/snack-bar').then(({ MatSnackBar }) =>
      this.injector.get(MatSnackBar).open(text, 'Fechar', { duration, panelClass }),
    );
  }
}
