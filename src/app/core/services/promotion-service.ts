import { Injectable, signal } from '@angular/core';
import { PROMOTIONS_MOCK } from '../data/promotions-mock';
import { Product } from '../models/product';
import { Promotion } from '../models/promotion';
import { applyPromotions } from '../utils/promotion-rules';
import { isoDay } from '../utils/storefront-rules';

/**
 * Promoções de preço (mock em memória). A loja recebe os produtos já com o
 * preço promocional aplicado (`CatalogService`); o backoffice edita por
 * `AdminPromotions`, que valida e audita. Fase 2: a loja recebe o preço pronto
 * do back (`GET /products`) e o pedido é recalculado lá — nunca confiar no front.
 */
@Injectable({ providedIn: 'root' })
export class PromotionService {
  private readonly state = signal<readonly Promotion[]>(PROMOTIONS_MOCK);
  readonly all = this.state.asReadonly();
  /** Hoje (`aaaa-mm-dd`). Fase 2: o back decide o que está no ar. */
  readonly today = signal(isoDay(new Date()));

  apply(product: Product): Product {
    return applyPromotions(product, this.state(), this.today());
  }

  save(id: number | null, data: Omit<Promotion, 'id' | 'sold'>): number {
    const nextId = id ?? Math.max(0, ...this.state().map((p) => p.id)) + 1;
    this.state.update((list) =>
      id == null
        ? [...list, { ...data, id: nextId, sold: 0 }]
        : list.map((p) => (p.id === id ? { ...p, ...data, id } : p)),
    );
    return nextId;
  }

  /** Pedido cancelado antes do envio: as unidades voltam para o limite da promoção. */
  release(id: number, quantity: number): void {
    this.state.update((list) =>
      list.map((p) => (p.id === id ? { ...p, sold: Math.max(0, p.sold - quantity) } : p)),
    );
  }

  remove(id: number): void {
    this.state.update((list) => list.filter((p) => p.id !== id));
  }
}
