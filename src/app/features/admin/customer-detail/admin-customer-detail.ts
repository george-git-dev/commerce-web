import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ROLE_LABELS } from '../../../core/config/permissions';
import { ORDER_STATUS_LABELS } from '../../../core/models/order';
import { AuthService } from '../../../core/services/auth-service';
import { formatCpf, maskCpf, maskPhone, onlyDigits } from '../../../core/utils/br-format';
import { AdminCustomerStore } from '../services/admin-customer-store';
import { blockReasonProblem } from '../services/customer-rules';
import { ActionDialog, ActionDialogData } from '../shared/action-dialog/action-dialog';

const ORDERS_PAGE = 10;

/**
 * `/admin/clientes/:id` — contato, resumo de compras, endereços e pedidos.
 * CPF, telefone e endereço completos só com `customers:sensitive`; ações
 * (bloquear, entrega em mãos) só com `customers:edit`.
 */
@Component({
  selector: 'app-admin-customer-detail',
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './admin-customer-detail.html',
  styleUrl: './admin-customer-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCustomerDetail {
  protected readonly store = inject(AdminCustomerStore);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });

  protected readonly sensitive = this.auth.can('customers:sensitive');
  protected readonly canEdit = this.auth.can('customers:edit');
  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly customer = computed(() =>
    this.store.find(Number(this.params().get('id')) || null),
  );
  protected readonly block = computed(() => {
    const customer = this.customer();
    return customer ? this.store.directory.blockOf(customer.email) : undefined;
  });
  protected readonly inHands = computed(() => {
    const customer = this.customer();
    return !!customer && this.store.directory.canReceiveInHands(customer.email);
  });
  protected readonly staffRoles = computed(() => {
    const customer = this.customer();
    return customer ? this.store.directory.staffRolesOf(customer.email) : [];
  });

  /** Dados que aparecem completos só para quem tem permissão. */
  protected readonly phone = computed(() => {
    const phone = this.customer()?.phone ?? '';
    return this.sensitive ? phone : maskPhone(phone);
  });
  protected readonly cpf = computed(() => {
    const cpf = this.customer()?.cpf ?? '';
    return this.sensitive ? formatCpf(cpf) : maskCpf(cpf);
  });
  protected readonly whatsapp = computed(() => {
    const digits = onlyDigits(this.customer()?.phone ?? '');
    return this.sensitive && digits.length >= 10 ? `https://wa.me/55${digits}` : null;
  });

  protected readonly ordersLimit = signal(ORDERS_PAGE);
  protected readonly visibleOrders = computed(
    () => this.customer()?.orders.slice(0, this.ordersLimit()) ?? [],
  );

  protected moreOrders(): void {
    this.ordersLimit.update((value) => value + ORDERS_PAGE);
  }

  protected toggleInHands(): void {
    const customer = this.customer();
    if (!customer || !this.canEdit) return;
    const allow = !this.inHands();
    const data: ActionDialogData = allow
      ? {
          title: 'Liberar entrega em mãos?',
          message: `${customer.name} poderá escolher "Entrega em mãos" (sem frete) no PRÓXIMO pedido. Depois do pedido, a liberação acaba sozinha.`,
          confirmLabel: 'Liberar',
        }
      : {
          title: 'Cancelar a liberação?',
          message: `${customer.name} não verá mais a entrega em mãos no checkout.`,
          confirmLabel: 'Cancelar liberação',
        };
    this.dialog
      .open(ActionDialog, { data, width: '440px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.store.setInHands(customer, allow);
        this.snackBar.open(allow ? 'Entrega em mãos liberada.' : 'Liberação cancelada.', 'Fechar', {
          duration: 3000,
        });
      });
  }

  protected toggleBlock(): void {
    const customer = this.customer();
    if (!customer || !this.canEdit) return;
    if (this.block()) {
      const data: ActionDialogData = {
        title: 'Desbloquear cliente?',
        message: `${customer.name} volta a entrar na conta e comprar.`,
        confirmLabel: 'Desbloquear',
      };
      this.dialog
        .open(ActionDialog, { data, width: '440px', maxWidth: 'calc(100vw - 32px)' })
        .afterClosed()
        .subscribe((confirmed) => {
          if (!confirmed) return;
          this.store.unblock(customer);
          this.snackBar.open('Cliente desbloqueado.', 'Fechar', { duration: 3000 });
        });
      return;
    }
    const data: ActionDialogData = {
      title: 'Bloquear cliente?',
      message: `${customer.name} não consegue mais entrar nem comprar. Os pedidos já feitos continuam. O cliente não vê o motivo.`,
      confirmLabel: 'Bloquear',
      danger: true,
      field: {
        label: 'Motivo (só a equipe vê)',
        placeholder: 'Ex.: tentativas de fraude no pagamento',
        error: 'Explique o motivo (5 a 200 caracteres).',
        validator: (control) => (blockReasonProblem(control.value ?? '') ? { reason: true } : null),
      },
    };
    this.dialog
      .open(ActionDialog, { data, width: '440px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((reason) => {
        if (typeof reason !== 'string') return;
        this.store.block(customer, reason);
        this.snackBar.open('Cliente bloqueado.', 'Fechar', { duration: 3000 });
      });
  }
}
