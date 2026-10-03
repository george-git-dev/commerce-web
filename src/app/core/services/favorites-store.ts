import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Product } from '../models/product';
import { AuthService } from './auth-service';

/**
 * Favoritos em memória, sem persistência — feature nova, ainda sem backend.
 * A reconexão com `/me/favorites` é dívida técnica conhecida, tarefa futura.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesStore {
  private readonly items = signal<readonly Product[]>([]);

  readonly products = this.items.asReadonly();
  readonly count = computed(() => this.items().length);

  constructor() {
    // Favoritos são da conta: ao sair, a lista some.
    const auth = inject(AuthService);
    effect(() => {
      if (!auth.isLoggedIn()) this.clear();
    });
  }

  isFavorite(productId: number): boolean {
    return this.items().some((product) => product.id === productId);
  }

  add(product: Product): void {
    if (!this.isFavorite(product.id)) this.items.update((items) => [...items, product]);
  }

  /** Na Fase 2 a lista vem de `/me/favorites` ao entrar. */
  clear(): void {
    this.items.set([]);
  }

  toggle(product: Product): void {
    this.items.update((items) =>
      items.some((item) => item.id === product.id)
        ? items.filter((item) => item.id !== product.id)
        : [...items, product],
    );
  }
}
