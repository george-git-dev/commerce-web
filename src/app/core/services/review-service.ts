import { computed, inject, Injectable, signal } from '@angular/core';
import { MOCK_PRODUCTS } from '../data/mock-products';
import { PENDING_REVIEWS_MOCK } from '../data/reviews-pending-mock';
import { REVIEWS_MOCK } from '../data/reviews-mock';
import { ProductReview, ReviewRecord, ReviewStatus } from '../models/review';
import { reviewerName } from '../utils/review-text';
import { AuthService } from './auth-service';

export interface ReviewSubmission {
  orderNumber: string;
  itemId: string;
  slug: string;
  productName: string;
  variantLabel: string;
  rating: number;
  comment: string;
}

export const REVIEW_COMMENT_MIN = 10;
export const REVIEW_COMMENT_MAX = 500;

/** Data de hoje (fuso local) em yyyy-MM-dd — `toISOString` usaria UTC e viraria o dia. */
function isoToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Aprovadas do mock da loja + pendentes do mock de moderação. */
function seed(): ReviewRecord[] {
  const productName = new Map(MOCK_PRODUCTS.map((p) => [p.id, p.name]));
  const approved = Object.entries(REVIEWS_MOCK).flatMap(([slug, list]) =>
    list.map((review): ReviewRecord => ({
      ...review,
      slug,
      productName: productName.get(review.productId) ?? slug,
      variantLabel: '',
      status: 'aprovada',
    })),
  );
  return [
    ...PENDING_REVIEWS_MOCK.map((r): ReviewRecord => ({ ...r, status: 'pendente' })),
    ...approved,
  ];
}

/**
 * Avaliações: envio pelo cliente, leitura na loja e moderação no backoffice.
 * Mock em memória que faz o papel do back. Regras (o back aplica de novo):
 * só pedido entregue, uma por item, entra PENDENTE e só aparece aprovada.
 * Fase 2: `POST /orders/{id}/items/{itemId}/review`,
 * `GET /products/{slug}/reviews`, `GET /admin/reviews?status=&page=`,
 * `POST /admin/reviews/{id}/approve|reject|reply` (recalcula a média do
 * produto na mesma transação).
 */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly auth = inject(AuthService);
  private readonly state = signal<readonly ReviewRecord[]>(seed());
  private nextId = 10_000;

  /** Todas (backoffice). */
  readonly all = this.state.asReadonly();
  readonly pendingCount = computed(
    () => this.state().filter((review) => review.status === 'pendente').length,
  );

  /** O que a loja recebe: aprovadas do produto, mais recentes primeiro, sem dados internos. */
  approvedFor(slug: string): ProductReview[] {
    return this.state()
      .filter((review) => review.slug === slug && review.status === 'aprovada')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .map(({ id, productId, authorName, rating, comment, createdAt, reply }) => ({
        id,
        productId,
        authorName,
        rating,
        comment,
        createdAt,
        ...(reply ? { reply } : {}),
      }));
  }

  /** Avaliação deste item do pedido (o cliente vê a situação em Meus pedidos). */
  of(orderNumber: string, itemId: string): ReviewRecord | undefined {
    return this.state().find(
      (review) => review.orderNumber === orderNumber && review.itemId === itemId,
    );
  }

  isReviewed(orderNumber: string, itemId: string): boolean {
    return !!this.of(orderNumber, itemId);
  }

  submit(review: ReviewSubmission): void {
    if (this.isReviewed(review.orderNumber, review.itemId)) return;
    const product = MOCK_PRODUCTS.find((p) => p.slug === review.slug);
    const record: ReviewRecord = {
      ...review,
      id: this.nextId++,
      productId: product?.id ?? 0,
      authorName: reviewerName(this.auth.user()?.name ?? ''),
      createdAt: isoToday(),
      status: 'pendente',
    };
    this.state.update((list) => [record, ...list]);
  }

  // ----- Moderação (só o backoffice chama; o back confere `approvals:edit`) -----

  find(id: number): ReviewRecord | undefined {
    return this.state().find((review) => review.id === id);
  }

  setStatus(id: number, status: ReviewStatus, by: string, reason?: string): void {
    this.patch(id, { status, moderation: { by, at: new Date(), ...(reason ? { reason } : {}) } });
  }

  /** `text` vazio remove a resposta. */
  setReply(id: number, text: string, by: string): void {
    const review = this.find(id);
    if (!review) return;
    const next: ReviewRecord = { ...review };
    if (text.trim()) {
      next.reply = { text: text.trim(), createdAt: isoToday() };
      next.replyBy = by;
    } else {
      delete next.reply;
      delete next.replyBy;
    }
    this.state.update((list) => list.map((item) => (item.id === id ? next : item)));
  }

  private patch(id: number, changes: Partial<ReviewRecord>): void {
    this.state.update((list) =>
      list.map((review) => (review.id === id ? { ...review, ...changes } : review)),
    );
  }
}
