import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { PAYMENT_METHOD_LABELS } from '../../../core/models/order';
import { ReturnRequest, ReturnStatus } from '../../../core/models/return-request';
import { maskEmail } from '../../../core/utils/br-format';
import { AuthService } from '../../../core/services/auth-service';
import { OrdersTabs } from '../orders/orders-tabs';
import { AdminOrderStore } from '../services/admin-order-store';
import { AdminReturns } from '../services/admin-returns';
import { ListMemory } from '../services/list-memory';
import { ActionDialog, ActionDialogData } from '../shared/action-dialog/action-dialog';
import { Pager } from '../shared/pager/pager';
import { Paging } from '../shared/pager/paging';
import { CompleteReturnDialog } from './complete-return-dialog';

type Filter = ReturnStatus | 'todas';

function createState() {
  const filter = signal<Filter>('solicitada');
  return { filter, paging: new Paging(() => filter()) };
}

/**
 * `/admin/pedidos/devolucoes` — pedidos de devolução dos clientes e os
 * registrados pela loja: aprovar/recusar, e concluir quando o produto chega
 * (estoque + estorno). Mais antigas primeiro nas solicitadas (fila).
 */
@Component({
  selector: 'app-admin-returns-page',
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, RouterLink, OrdersTabs, Pager],
  templateUrl: './admin-returns-page.html',
  styleUrl: './admin-returns-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReturnsPage {
  protected readonly store = inject(AdminReturns);
  private readonly orders = inject(AdminOrderStore);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly state = inject(ListMemory).get('devolucoes', createState);
  protected readonly filter = this.state.filter;
  protected readonly paging = this.state.paging;
  protected readonly methodLabels = PAYMENT_METHOD_LABELS;

  protected readonly filters = computed(() => {
    const all = this.store.all();
    const count = (s: ReturnStatus) => all.filter((r) => r.status === s).length;
    return [
      { id: 'solicitada' as Filter, label: 'Solicitadas', count: count('solicitada') },
      { id: 'aprovada' as Filter, label: 'Aguardando produto', count: count('aprovada') },
      { id: 'concluida' as Filter, label: 'Concluídas', count: count('concluida') },
      { id: 'recusada' as Filter, label: 'Recusadas', count: count('recusada') },
      { id: 'todas' as Filter, label: 'Todas', count: all.length },
    ];
  });

  protected readonly list = computed(() => {
    const filter = this.filter();
    const list = this.store.all().filter((r) => filter === 'todas' || r.status === filter);
    // Fila: as pendentes mais antigas primeiro; o histórico, mais recentes primeiro.
    const oldestFirst = filter === 'solicitada' || filter === 'aprovada';
    return [...list].sort((a, b) =>
      oldestFirst
        ? a.createdAt.getTime() - b.createdAt.getTime()
        : b.createdAt.getTime() - a.createdAt.getTime(),
    );
  });
  protected readonly page = computed(() => this.paging.of(this.list()));

  /** E-mail completo só com `customers:sensitive`. */
  protected email(value: string): string {
    return this.auth.can('customers:sensitive') ? value : maskEmail(value);
  }

  /** Pedido do backoffice (os de exemplo da loja não existem aqui no mock). */
  protected orderExists(number: string): boolean {
    return !!this.orders.find(number);
  }

  protected restocked(r: ReturnRequest, itemId: string): number | null {
    return r.completion?.received.find((x) => x.itemId === itemId)?.restock ?? null;
  }

  protected approve(r: ReturnRequest): void {
    const data: ActionDialogData = {
      title: `Aprovar devolução · ${r.orderNumber}`,
      message: `Combine o envio com ${r.customerName} pelo WhatsApp. Quando o produto chegar, conclua a devolução e faça o estorno.`,
      confirmLabel: 'Aprovar',
    };
    this.confirm(data, () => this.store.approve(r), 'Devolução aprovada.');
  }

  protected refuse(r: ReturnRequest): void {
    const data: ActionDialogData = {
      title: `Recusar devolução · ${r.orderNumber}`,
      message: 'O cliente vê o motivo em Meus pedidos.',
      confirmLabel: 'Recusar',
      danger: true,
      field: {
        label: 'Motivo',
        placeholder: 'Ex.: fora do prazo de 30 dias da entrega',
        error: 'Escreva o motivo (mínimo 5 caracteres).',
        validator: (control) => ((control.value ?? '').trim().length >= 5 ? null : { min: true }),
      },
    };
    this.confirm(data, (reason) => this.store.refuse(r, String(reason)), 'Devolução recusada.');
  }

  protected refuseAfterReview(r: ReturnRequest): void {
    const data: ActionDialogData = {
      title: `Recusar após avaliação · ${r.orderNumber}`,
      message:
        'Sem estorno e sem entrada no estoque. O produto volta para o cliente — combine o reenvio pelo WhatsApp. O cliente vê o motivo em Meus pedidos.',
      confirmLabel: 'Recusar devolução',
      danger: true,
      field: {
        label: 'Motivo',
        placeholder: 'Ex.: frasco aberto e usado (mais de 10% consumido)',
        error: 'Escreva o motivo (mínimo 5 caracteres).',
        validator: (control) => ((control.value ?? '').trim().length >= 5 ? null : { min: true }),
      },
    };
    this.confirm(
      data,
      (reason) => this.store.refuseAfterReview(r, String(reason)),
      'Devolução recusada após avaliação.',
    );
  }

  protected complete(r: ReturnRequest): void {
    this.dialog
      .open(CompleteReturnDialog, { data: r, width: '520px', maxWidth: '94vw' })
      .afterClosed()
      .subscribe((done?: boolean) => {
        if (done) this.snackBar.open('Devolução concluída.', 'Fechar', { duration: 3500 });
      });
  }

  private confirm(
    data: ActionDialogData,
    run: (result: string | true) => boolean,
    message: string,
  ): void {
    this.dialog
      .open(ActionDialog, { data, width: '440px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((result: string | true | undefined) => {
        if (result && run(result)) this.snackBar.open(message, 'Fechar', { duration: 3500 });
      });
  }
}
