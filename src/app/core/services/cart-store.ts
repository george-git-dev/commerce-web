import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/product';

interface CartLine {
  product: Product;
  quantity: number;
}

/** Carrinho mínimo: alimenta o badge do header e o feedback do botão de compra. */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly lines = signal<readonly CartLine[]>([]);

  readonly count = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));

  add(product: Product): void {
    this.lines.update((lines) => {
      const existing = lines.find((line) => line.product.id === product.id);
      return existing
        ? lines.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line))
        : [...lines, { product, quantity: 1 }];
    });
  }
}
