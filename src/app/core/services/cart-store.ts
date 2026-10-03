import { Injectable, computed, signal } from '@angular/core';
import { Product, ProductVariant } from '../models/product';
import { effectivePrice } from '../utils/product-pricing';

/**
 * Uma linha do carrinho = uma variante (tamanho) de um produto.
 * "Oud Real 100 ml" e "Oud Real 50 ml" são linhas diferentes.
 */
export interface CartLine {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

/**
 * Carrinho em memória, sem persistência — alimenta o badge do header e a
 * página `/carrinho`. A integração com `/me/cart` é uma etapa separada do
 * roadmap. A quantidade nunca passa do estoque da variante; ainda assim, o
 * back vai revalidar tudo no checkout (o front não é fonte de verdade).
 */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly lines = signal<readonly CartLine[]>([]);

  readonly items = this.lines.asReadonly();
  readonly count = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));
  readonly subtotal = computed(() =>
    this.lines().reduce((sum, line) => sum + effectivePrice(line.variant) * line.quantity, 0),
  );

  add(product: Product, variant: ProductVariant, quantity = 1): void {
    if (variant.stock <= 0) return;
    this.lines.update((lines) => {
      const existing = lines.find((line) => line.variant.id === variant.id);
      if (!existing) {
        return [...lines, { product, variant, quantity: Math.min(quantity, variant.stock) }];
      }
      return lines.map((line) =>
        line === existing
          ? { ...line, quantity: Math.min(line.quantity + quantity, variant.stock) }
          : line,
      );
    });
  }

  setQuantity(variantId: string, quantity: number): void {
    if (quantity <= 0) {
      this.remove(variantId);
      return;
    }
    this.lines.update((lines) =>
      lines.map((line) =>
        line.variant.id === variantId
          ? { ...line, quantity: Math.min(quantity, line.variant.stock) }
          : line,
      ),
    );
  }

  /** Esvazia depois que o pedido é criado. */
  clear(): void {
    this.lines.set([]);
  }

  remove(variantId: string): void {
    this.lines.update((lines) => lines.filter((line) => line.variant.id !== variantId));
  }
}
