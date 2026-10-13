import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { Product, ProductVariant } from '../models/product';
import { readJson, writeJson } from '../utils/browser-storage';
import { effectivePrice } from '../utils/product-pricing';
import { CatalogService } from './catalog-service';

/**
 * Uma linha do carrinho = uma variante (tamanho) de um produto.
 * "Oud Real 100 ml" e "Oud Real 50 ml" são linhas diferentes.
 */
export interface CartLine {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export const CART_STORAGE_KEY = 'nani.cart.v1';

/** O que vai para o navegador: só identificadores e quantidade, nunca o preço. */
interface StoredLine {
  slug: string;
  variantId: string;
  quantity: number;
}

/**
 * Sacola do cliente (inclusive visitante), guardada no navegador para não sumir
 * ao recarregar. Ao abrir, é remontada a partir do catálogo atual: preço novo,
 * produto que saiu é descartado e a quantidade respeita o estoque.
 * Fase 2 (B5): `/me/cart` no back, juntando a sacola de visitante ao entrar.
 * O back revalida tudo no checkout (o front não é fonte de verdade).
 */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly catalog = inject(CatalogService);
  private readonly lines = signal<readonly CartLine[]>(this.restore());

  readonly items = this.lines.asReadonly();
  readonly count = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));
  readonly subtotal = computed(() =>
    this.lines().reduce((sum, line) => sum + effectivePrice(line.variant) * line.quantity, 0),
  );

  constructor() {
    effect(() => {
      const stored: StoredLine[] = this.lines().map((line) => ({
        slug: line.product.slug,
        variantId: line.variant.id,
        quantity: line.quantity,
      }));
      writeJson(CART_STORAGE_KEY, stored);
    });

    // Outra aba mexeu na sacola: atualiza esta também.
    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) this.lines.set(this.restore());
    };
    globalThis.addEventListener?.('storage', onStorage);
    inject(DestroyRef).onDestroy(() => globalThis.removeEventListener?.('storage', onStorage));
  }

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

  /** Remonta a sacola salva a partir do catálogo atual. */
  private restore(): CartLine[] {
    const stored = readJson<StoredLine[]>(CART_STORAGE_KEY);
    if (!Array.isArray(stored)) return [];
    const lines: CartLine[] = [];
    for (const item of stored) {
      const product = this.catalog.findBySlug(item?.slug ?? null);
      const variant = product?.variants.find((option) => option.id === item.variantId);
      const quantity = Math.min(Math.floor(Number(item.quantity)), variant?.stock ?? 0);
      if (product && variant && quantity > 0) lines.push({ product, variant, quantity });
    }
    return lines;
  }
}
