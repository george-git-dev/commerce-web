import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { ReviewRecord, ReviewStatus } from '../../../core/models/review';
import { REVIEW_FLAG_LABELS, reviewFlags } from '../../../core/utils/review-text';
import { StarRating } from '../../../shared/star-rating/star-rating';
import { AdminOrderStore } from '../services/admin-order-store';
import { ListMemory } from '../services/list-memory';
import { ReviewModeration } from '../services/review-moderation';
import { ActionDialog, ActionDialogData } from '../shared/action-dialog/action-dialog';
import { Pager } from '../shared/pager/pager';
import { Paging } from '../shared/pager/paging';
import { RejectReviewDialog } from './reject-review-dialog';
import { ReplyDialog, ReplyDialogData } from './reply-dialog';

const TABS: readonly { id: ReviewStatus; label: string }[] = [
  { id: 'pendente', label: 'Pendentes' },
  { id: 'aprovada', label: 'Aprovadas' },
  { id: 'reprovada', label: 'Reprovadas' },
];

function createState() {
  const status = signal<ReviewStatus>('pendente');
  const search = signal('');
  const paging = new Paging(() => `${status()}|${search()}`);
  return { status, search, paging };
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * `/admin/aprovacoes` — moderação de avaliações (preparada para receber
 * Trocas/Devoluções como outra aba). Pendentes por ordem de chegada (mais
 * antigas primeiro); aprovadas e reprovadas, mais recentes primeiro.
 */
@Component({
  selector: 'app-admin-approvals',
  imports: [DatePipe, MatButtonModule, MatIconModule, RouterLink, StarRating, Pager],
  templateUrl: './admin-approvals.html',
  styleUrl: './admin-approvals.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminApprovals {
  protected readonly moderation = inject(ReviewModeration);
  private readonly orders = inject(AdminOrderStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly state = inject(ListMemory).get('aprovacoes', createState);

  protected readonly tabs = TABS;
  protected readonly flagLabels = REVIEW_FLAG_LABELS;
  protected readonly status = this.state.status;
  protected readonly search = this.state.search;
  protected readonly paging = this.state.paging;

  protected readonly counts = computed(() => {
    const all = this.moderation.all();
    return Object.fromEntries(
      TABS.map((tab) => [tab.id, all.filter((review) => review.status === tab.id).length]),
    ) as Record<ReviewStatus, number>;
  });

  protected readonly filtered = computed(() => {
    const status = this.status();
    const term = normalize(this.search().trim());
    const oldestFirst = status === 'pendente';
    return this.moderation
      .all()
      .filter(
        (review) =>
          review.status === status &&
          (!term || normalize(`${review.productName} ${review.authorName}`).includes(term)),
      )
      .sort((a, b) => {
        const diff = a.createdAt.localeCompare(b.createdAt) || a.id - b.id;
        return oldestFirst ? diff : -diff;
      });
  });

  protected readonly page = computed(() => this.paging.of(this.filtered()));

  protected flags(review: ReviewRecord) {
    return reviewFlags(review.comment);
  }

  /** Só vira link quando o pedido existe no backoffice. */
  protected orderExists(number: string | undefined): boolean {
    return !!number && !!this.orders.find(number);
  }

  protected approve(review: ReviewRecord): void {
    this.moderation.approve(review);
    this.snackBar.open('Avaliação publicada no produto.', 'Fechar', { duration: 3000 });
  }

  protected reject(review: ReviewRecord): void {
    this.dialog
      .open(RejectReviewDialog, {
        data: { published: review.status === 'aprovada' },
        width: '440px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .subscribe((reason) => {
        if (typeof reason !== 'string') return;
        this.moderation.reject(review, reason);
        this.snackBar.open(
          review.status === 'aprovada' ? 'Avaliação tirada do ar.' : 'Avaliação reprovada.',
          'Fechar',
          { duration: 3000 },
        );
      });
  }

  protected reply(review: ReviewRecord): void {
    const data: ReplyDialogData = {
      authorName: review.authorName,
      comment: review.comment,
      current: review.reply?.text,
    };
    this.dialog
      .open(ReplyDialog, { data, width: '520px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((text) => {
        if (typeof text !== 'string') return;
        if (this.moderation.reply(review, text)) {
          this.snackBar.open('Resposta publicada no produto.', 'Fechar', { duration: 3000 });
        }
      });
  }

  protected removeReply(review: ReviewRecord): void {
    const data: ActionDialogData = {
      title: 'Remover a resposta da loja?',
      message: 'A resposta some da página do produto. A avaliação continua publicada.',
      confirmLabel: 'Remover',
      danger: true,
    };
    this.dialog
      .open(ActionDialog, { data, width: '440px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.moderation.removeReply(review);
        this.snackBar.open('Resposta removida.', 'Fechar', { duration: 3000 });
      });
  }
}
