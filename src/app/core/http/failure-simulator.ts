import { DOCUMENT } from '@angular/common';
import { inject, Injectable, isDevMode, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Falhas que dá para simular no mock (só em desenvolvimento). */
export type SimulatedFailure = 'erro' | 'lento' | 'offline' | 'sessao' | 'limite' | 'validacao';

export const SIMULATED_FAILURES: Record<SimulatedFailure, string> = {
  erro: 'Erro no servidor (500)',
  lento: 'Servidor sem resposta (timeout)',
  offline: 'Sem conexão',
  sessao: 'Sessão expirada (401)',
  limite: 'Muitas tentativas (429)',
  validacao: 'Recusado pelo back (422)',
};

/**
 * Simulador de falha do back (só `ng serve`): abra qualquer página com
 * `?simular=erro|lento|offline|sessao|limite|validacao` e as chamadas ao mock
 * passam a falhar assim; `?simular=` desliga. Fica só em memória.
 * Some na Fase 2 (junto com o mock da API).
 */
@Injectable({ providedIn: 'root' })
export class FailureSimulator {
  readonly enabled = isDevMode();
  readonly mode = signal<SimulatedFailure | null>(null);

  constructor() {
    if (!this.enabled) return;
    this.read(inject(DOCUMENT).location?.search ?? '');
    inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => this.read(event.urlAfterRedirects.split('?')[1] ?? ''));
  }

  off(): void {
    this.mode.set(null);
  }

  private read(search: string): void {
    const params = new URLSearchParams(search);
    if (!params.has('simular')) return;
    const value = params.get('simular') as SimulatedFailure;
    this.mode.set(value in SIMULATED_FAILURES ? value : null);
  }
}
