import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../../core/services/auth-service';

/**
 * Guarda em MEMÓRIA a busca, os filtros, a ordem e a página de cada lista do
 * backoffice: abrir uma ficha e voltar cai no mesmo lugar. Nada vai para a URL
 * (busca pode ter nome/e-mail) nem para o navegador; F5 ou trocar de usuário
 * zera tudo.
 */
@Injectable({ providedIn: 'root' })
export class ListMemory {
  private readonly auth = inject(AuthService);
  private readonly states = new Map<string, unknown>();
  private owner: string | undefined;

  get<T>(key: string, create: () => T): T {
    const email = this.auth.user()?.email;
    if (email !== this.owner) {
      this.states.clear();
      this.owner = email;
    }
    if (!this.states.has(key)) this.states.set(key, create());
    return this.states.get(key) as T;
  }
}
