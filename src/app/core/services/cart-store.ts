import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/product';

export interface CartLine {
  product: Product;
  quantity: number;
}

/**
 * Carrinho em memória, sem persistência — alimenta o badge do header e a
 * página `/carrinho`. A integração com `/me/cart` de verdade é uma etapa
 * separada do roadmap; até lá, tudo aqui é local ao browser.
 */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly lines = signal<readonly CartLine[]>([]);

  readonly items = this.lines.asReadonly();
  readonly count = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));
  readonly subtotal = computed(() =>
    this.lines().reduce((sum, line) => sum + line.product.finalPrice * line.quantity, 0),
  );

  add(product: Product, quantity = 1): void {
    this.lines.update((lines) => {
      const existing = lines.find((line) => line.product.id === product.id);
      return existing
        ? lines.map((line) =>
            line === existing ? { ...line, quantity: line.quantity + quantity } : line,
          )
        : [...lines, { product, quantity }];
    });
  }

  setQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.remove(productId);
      return;
    }
    this.lines.update((lines) =>
      lines.map((line) => (line.product.id === productId ? { ...line, quantity } : line)),
    );
  }

  remove(productId: number): void {
    this.lines.update((lines) => lines.filter((line) => line.product.id !== productId));
  }
}
