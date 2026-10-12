import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { Affiliate, AffiliateStatus } from '../../../core/models/affiliate';
import { AFFILIATE_STATUS_LABELS } from '../../../core/utils/affiliate-rules';
import { AdminAffiliates } from '../services/admin-affiliates';
import { ListMemory } from '../services/list-memory';
import { ActionDialog, ActionDialogData } from '../shared/action-dialog/action-dialog';
import { Pager } from '../shared/pager/pager';
import { Paging } from '../shared/pager/paging';
import { ApproveAffiliateDialog } from './approve-affiliate-dialog';

const TABS: readonly { id: AffiliateStatus; label: string }[] = [
  { id: 'pendente', label: 'Em análise' },
  { id: 'aprovado', label: 'Aprovados' },
  { id: 'reprovado', label: 'Não aprovados' },
];

function createState() {
  const status = signal<AffiliateStatus>('pendente');
  const search = signal('');
  return { status, search, paging: new Paging(() => `${status()}|${search()}`) };
}

/** Aba "Pedidos" de Afiliados: quem pediu para entrar no programa (aprovar cria o cupom). */
@Component({
  selector: 'app-affiliate-requests',
  imports: [DatePipe, MatButtonModule, MatIconModule, RouterLink, Pager],
  templateUrl: './affiliate-requests.html',
  styleUrl: '../reviews/admin-reviews.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AffiliateRequests {
  protected readonly store = inject(AdminAffiliates);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly state = inject(ListMemory).get('afiliados-pedidos', createState);
  protected readonly tabs = TABS;
  protected readonly labels = AFFILIATE_STATUS_LABELS;
  protected readonly status = this.state.status;
  protected readonly search = this.state.search;
  protected readonly paging = this.state.paging;

  protected readonly counts = computed(() => {
    const all = this.store.all();
    return Object.fromEntries(
      TABS.map((tab) => [tab.id, all.filter((a) => a.status === tab.id).length]),
    ) as Record<AffiliateStatus, number>;
  });

  /** Em análise: mais antigos primeiro (fila); os outros: decisão mais recente primeiro. */
  protected readonly filtered = computed(() => {
    const status = this.status();
    const term = this.search().trim().toLocaleLowerCase('pt-BR');
    return this.store
      .all()
      .filter((a) => a.status === status)
      .filter(
        (a) =>
          !term ||
          `${a.name} ${a.profile} ${a.couponCode ?? ''}`.toLocaleLowerCase('pt-BR').includes(term),
      )
      .sort((a, b) =>
        status === 'pendente'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : (b.decision?.at.getTime() ?? 0) - (a.decision?.at.getTime() ?? 0),
      );
  });

  protected readonly page = computed(() => this.paging.of(this.filtered()));

  protected approve(affiliate: Affiliate): void {
    this.dialog
      .open(ApproveAffiliateDialog, { data: affiliate, width: '440px' })
      .afterClosed()
      .subscribe((code?: string) => {
        if (code && this.store.approve(affiliate, code)) {
          this.snackBar.open(`${affiliate.name} aprovado — cupom ${code} criado.`, 'Fechar', {
            duration: 4000,
          });
        }
      });
  }

  protected reject(affiliate: Affiliate): void {
    const data: ActionDialogData = {
      title: `Não aprovar ${affiliate.name}?`,
      message:
        'A pessoa vê o motivo em Minha conta e pode pedir de novo depois de 30 dias. Seja objetivo e educado.',
      confirmLabel: 'Não aprovar',
      danger: true,
      field: {
        label: 'Motivo (a pessoa vê)',
        placeholder: 'Ex.: perfil sem publicações sobre perfumes',
        error: 'Explique o motivo (mínimo 5 letras).',
        validator: Validators.minLength(5),
      },
    };
    this.dialog
      .open(ActionDialog, { data, width: '440px' })
      .afterClosed()
      .subscribe((reason?: string) => {
        if (typeof reason === 'string' && this.store.reject(affiliate, reason)) {
          this.snackBar.open('Pedido não aprovado.', 'Fechar', { duration: 3000 });
        }
      });
  }
}
