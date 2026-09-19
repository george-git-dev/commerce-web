import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/product';

/**
 * Favoritos em memória, sem persistência — feature nova, ainda sem backend.
 * A reconexão com `/me/favorites` é dívida técnica conhecida, tarefa futura.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesStore {
  private readonly items = signal<readonly Product[]>([]);

  readonly products = this.items.asReadonly();
  readonly count = computed(() => this.items().length);

  isFavorite(productId: number): boolean {
    return this.items().some((product) => product.id === productId);
  }

  toggle(product: Product): void {
    this.items.update((items) =>
      items.some((item) => item.id === product.id)
        ? items.filter((item) => item.id !== product.id)
        : [...items, product],
    );
  }
}
