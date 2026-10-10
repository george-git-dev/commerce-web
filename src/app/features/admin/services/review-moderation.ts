import { computed, inject, Injectable } from '@angular/core';
import { ReviewRecord } from '../../../core/models/review';
import { AuthService } from '../../../core/services/auth-service';
import { ReviewService } from '../../../core/services/review-service';
import { replyProblem } from '../../../core/utils/review-text';
import { AdminAudit } from './admin-audit';

/** Motivos de reprovação (só a equipe vê; o cliente vê "Não publicada"). */
export const REJECT_REASONS = [
  'Ofensivo ou desrespeitoso',
  'Expõe dados pessoais',
  'Não fala do produto',
  'Spam ou propaganda',
] as const;

/**
 * Moderação de avaliações no backoffice: aprovar, reprovar (com motivo) e
 * responder em nome da loja. A equipe nunca edita o texto do cliente. Tudo
 * auditado. Só com `approvals:edit` (o back confere de novo).
 */
@Injectable({ providedIn: 'root' })
export class ReviewModeration {
  private readonly reviews = inject(ReviewService);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);

  readonly all = this.reviews.all;
  readonly pendingCount = this.reviews.pendingCount;
  readonly canEdit = computed(() => this.auth.can('approvals:edit'));

  approve(review: ReviewRecord): void {
    if (!this.canEdit() || review.status === 'aprovada') return;
    this.reviews.setStatus(review.id, 'aprovada', this.who());
    this.record('Aprovou avaliação', review, [
      { field: 'Situação', before: label(review.status), after: 'Aprovada' },
    ]);
  }

  reject(review: ReviewRecord, reason: string): void {
    if (!this.canEdit() || review.status === 'reprovada' || reason.trim().length < 3) return;
    this.reviews.setStatus(review.id, 'reprovada', this.who(), reason.trim());
    this.record(
      review.status === 'aprovada' ? 'Tirou avaliação do ar' : 'Reprovou avaliação',
      review,
      [
        { field: 'Situação', before: label(review.status), after: 'Reprovada' },
        { field: 'Motivo', before: '', after: reason.trim() },
      ],
    );
  }

  /** Responde (ou edita a resposta). Só em avaliação aprovada. */
  reply(review: ReviewRecord, text: string): boolean {
    if (!this.canEdit() || review.status !== 'aprovada' || replyProblem(text)) return false;
    this.reviews.setReply(review.id, text, this.who());
    this.record(review.reply ? 'Editou resposta da loja' : 'Respondeu avaliação', review, [
      { field: 'Resposta', before: review.reply?.text ?? '', after: text.trim() },
    ]);
    return true;
  }

  removeReply(review: ReviewRecord): void {
    if (!this.canEdit() || !review.reply) return;
    this.reviews.setReply(review.id, '', this.who());
    this.record('Removeu resposta da loja', review, [
      { field: 'Resposta', before: review.reply.text, after: '' },
    ]);
  }

  private who(): string {
    return this.auth.user()?.name ?? 'Equipe';
  }

  private record(
    action: string,
    review: ReviewRecord,
    changes: { field: string; before: string; after: string }[],
  ): void {
    this.audit.record({
      by: this.who(),
      action,
      entity: 'Avaliação',
      entityId: `${review.id} · ${review.productName}`,
      changes,
    });
  }
}

function label(status: ReviewRecord['status']): string {
  return status === 'pendente' ? 'Pendente' : status === 'aprovada' ? 'Aprovada' : 'Reprovada';
}
