import { CurrencyPipe, DatePipe, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PAYMENT_METHOD_LABELS } from '../../../core/models/order';
import { AuthService } from '../../../core/services/auth-service';
import { maskPhone, onlyDigits } from '../../../core/utils/br-format';
import { OrderStatusChip } from '../../../shared/order-status/order-status';
import {
  advanceLabel,
  canCancel,
  isValidTracking,
  needsTracking,
  statusLabel,
} from '../services/admin-order-flow';
import { AdminCustomerStore } from '../services/admin-customer-store';
import { AdminOrderStore } from '../services/admin-order-store';
import { ActionDialog, ActionDialogData } from '../shared/action-dialog/action-dialog';

/** `/admin/pedidos/:numero` — detalhe, histórico e ações do pedido. */
@Component({
  selector: 'app-admin-order-detail',
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, RouterLink, OrderStatusChip],
  templateUrl: './admin-order-detail.html',
  styleUrl: './admin-order-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrderDetail {
  private readonly store = inject(AdminOrderStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly document = inject(DOCUMENT);
  protected readonly auth = inject(AuthService);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });

  protected readonly order = computed(() => this.store.find(this.params().get('numero')));
  /** Código do cliente (link para a ficha; só com `customers:view`). */
  protected readonly customerId = computed(() => {
    const email = this.order()?.customer.email;
    if (!email || !this.auth.can('customers:view')) return null;
    return this.customers.customers().find((c) => c.email === email)?.id ?? null;
  });
  private readonly customers = inject(AdminCustomerStore);
  protected readonly methodLabels = PAYMENT_METHOD_LABELS;
  protected readonly statusLabel = statusLabel;

  protected readonly canEdit = computed(() => this.auth.can('orders:edit'));
  /** CPF/telefone completos só para quem tem a permissão (o resto vê mascarado). */
  protected readonly sensitive = computed(() => this.auth.can('customers:sensitive'));

  protected readonly advanceText = computed(() => {
    const order = this.order();
    return order ? advanceLabel(order) : null;
  });
  protected readonly cancellable = computed(() => {
    const order = this.order();
    return !!order && canCancel(order);
  });

  protected phone(value: string): string {
    return this.sensitive() ? value : maskPhone(value);
  }

  protected whatsapp(value: string): string {
    return `https://wa.me/55${onlyDigits(value)}`;
  }

  protected advance(): void {
    const order = this.order();
    const label = this.advanceText();
    if (!order || !label) return;
    const tracking = needsTracking(order);
    const data: ActionDialogData = {
      title: label,
      message: tracking
        ? 'Informe o código de rastreio da transportadora. O cliente vê esse código no pedido.'
        : `O pedido ${order.number} passa para "${label.replace('Marcar como ', '').replace('Iniciar ', 'Em ')}".`,
      confirmLabel: 'Confirmar',
      field: tracking
        ? {
            label: 'Código de rastreio',
            placeholder: 'AA123456789BR',
            error: 'Use de 8 a 30 letras e números.',
            validator: (control) =>
              isValidTracking(control.value ?? '') ? null : { tracking: true },
            uppercase: true,
          }
        : undefined,
    };
    this.dialog
      .open(ActionDialog, { data, width: '440px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((result: string | true | undefined) => {
        if (!result) return;
        const updated = this.store.advance(
          order.number,
          typeof result === 'string' ? result : undefined,
        );
        if (updated) {
          this.snackBar.open(
            `Pedido ${order.number}: ${statusLabel(updated.status, updated.shipping)}.`,
            'Fechar',
            { duration: 3500 },
          );
        }
      });
  }

  protected cancel(): void {
    const order = this.order();
    if (!order) return;
    const paid = order.status !== 'aguardando-pagamento';
    this.dialog
      .open(ActionDialog, {
        data: {
          title: `Cancelar pedido ${order.number}`,
          message: paid
            ? 'O pagamento será estornado pelo gateway e os itens voltam ao estoque. Não dá para desfazer.'
            : 'Os itens voltam ao estoque. Não dá para desfazer.',
          confirmLabel: 'Cancelar pedido',
          danger: true,
          field: {
            label: 'Motivo do cancelamento',
            placeholder: 'Ex.: cliente desistiu da compra',
            error: 'Informe o motivo (mínimo 5 caracteres).',
            validator: (control) =>
              (control.value ?? '').trim().length >= 5 ? null : { reason: true },
          },
        } satisfies ActionDialogData,
        width: '440px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .subscribe((reason: string | undefined) => {
        if (!reason || !this.store.cancel(order.number, reason)) return;
        this.snackBar.open(`Pedido ${order.number} cancelado.`, 'Fechar', { duration: 3500 });
      });
  }

  protected print(): void {
    this.document.defaultView?.print();
  }
}
