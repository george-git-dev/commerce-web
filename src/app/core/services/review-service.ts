import { Injectable, signal } from '@angular/core';

export interface ReviewSubmission {
  orderNumber: string;
  itemId: string;
  slug: string;
  rating: number;
  comment: string;
}

export const REVIEW_COMMENT_MIN = 10;
export const REVIEW_COMMENT_MAX = 500;

/**
 * Envio de avaliação pelo cliente. Entra como PENDENTE: só aparece na página
 * do produto depois de aprovada no backoffice (F11). Hoje fica em memória.
 * Fase 2: `POST /orders/{orderId}/items/{itemId}/review` — o back confere que o
 * pedido é do cliente, está entregue e o item ainda não foi avaliado.
 */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly pending = signal<readonly ReviewSubmission[]>([]);

  isReviewed(orderNumber: string, itemId: string): boolean {
    return this.pending().some(
      (review) => review.orderNumber === orderNumber && review.itemId === itemId,
    );
  }

  submit(review: ReviewSubmission): void {
    if (this.isReviewed(review.orderNumber, review.itemId)) return;
    this.pending.update((list) => [...list, review]);
  }
}
