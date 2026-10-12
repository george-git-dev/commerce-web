import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { CommissionStatus, Payout } from '../../../core/models/commission';
import { COMMISSION_STATUS_LABELS } from '../../../core/utils/commission-rules';
import { AdminCommissions } from '../services/admin-commissions';
import { AdminOrderStore } from '../services/admin-order-store';
import { ListMemory } from '../services/list-memory';
import { ActionDialog, ActionDialogData } from '../shared/action-dialog/action-dialog';
import { Pager } from '../shared/pager/pager';
import { Paging } from '../shared/pager/paging';

type Tab = 'afiliados' | 'comissoes' | 'pagamentos';

function createState() {
  const tab = signal<Tab>('afiliados');
  const status = signal<CommissionStatus | 'todas'>('todas');
  const affiliate = signal('');
  return {
    tab,
    status,
    affiliate,
    paging: new Paging(() => `${tab()}|${status()}|${affiliate()}`),
  };
}

/**
 * `/admin/afiliados` — afiliados aprovados (vendas e totais), comissões e
 * pagamentos (fechar o mês, marcar Pix pago). Pedidos de afiliação ficam em
 * Aprovações → Afiliados.
 */
@Component({
  selector: 'app-admin-affiliate-payouts',
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, RouterLink, Pager],
  templateUrl: './admin-affiliate-payouts.html',
  styleUrl: './admin-affiliate-payouts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAffiliatePayouts {
  protected readonly store = inject(AdminCommissions);
  private readonly orders = inject(AdminOrderStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly state = inject(ListMemory).get('afiliados-pagamentos', createState);
  protected readonly tab = this.state.tab;
  protected readonly status = this.state.status;
  protected readonly affiliate = this.state.affiliate;
  protected readonly paging = this.state.paging;
  protected readonly labels = COMMISSION_STATUS_LABELS;
  protected readonly statuses: readonly (CommissionStatus | 'todas')[] = [
    'todas',
    'pendente',
    'liberada',
    'paga',
    'cancelada',
  ];
  protected readonly tabs: readonly { id: Tab; label: string }[] = [
    { id: 'afiliados', label: 'Afiliados' },
    { id: 'comissoes', label: 'Comissões' },
    { id: 'pagamentos', label: 'Pagamentos' },
  ];

  protected readonly commissions = computed(() => {
    const status = this.status();
    const email = this.affiliate();
    return this.store
      .commissions()
      .filter((c) => !email || c.affiliateEmail === email)
      .filter((c) => status === 'todas' || this.store.status(c) === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  });
  protected readonly commissionPage = computed(() => this.paging.of(this.commissions()));

  /** A pagar primeiro; depois os mais recentes. */
  protected readonly payouts = computed(() =>
    [...this.store.payouts()]
      .filter((p) => !this.affiliate() || p.affiliateEmail === this.affiliate())
      .sort(
        (a, b) =>
          Number(b.status === 'a-pagar') - Number(a.status === 'a-pagar') ||
          b.createdAt.getTime() - a.createdAt.getTime(),
      ),
  );
  protected readonly payoutPage = computed(() => this.paging.of(this.payouts()));

  protected orderExists(number: string): boolean {
    return !!this.orders.find(number);
  }

  protected close(): void {
    const preview = this.store.closingPreview();
    const data: ActionDialogData = {
      title: 'Fechar comissões liberadas?',
      message: preview.count
        ? `${preview.count} comissões liberadas (${preview.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) viram pagamentos: quem escolheu crédito na loja recebe na hora (+${this.store.program.storeCreditBonusPercent}%); quem escolheu Pix fica "a pagar". Pix abaixo de R$ ${this.store.program.minPayout} acumula para o próximo fechamento.`
        : 'Não há comissões liberadas agora.',
      confirmLabel: 'Fechar',
    };
    if (!preview.count) {
      this.snackBar.open('Não há comissões liberadas para fechar.', 'Fechar', { duration: 3000 });
      return;
    }
    this.dialog
      .open(ActionDialog, { data, width: '460px' })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        const result = this.store.close();
        if (!result) return;
        const carried = result.carried.length
          ? ` ${result.carried.length} afiliado(s) com Pix abaixo do mínimo ficaram para o próximo.`
          : '';
        this.snackBar.open(`${result.created.length} pagamento(s) gerado(s).${carried}`, 'Fechar', {
          duration: 5000,
        });
        this.tab.set('pagamentos');
      });
  }

  protected markPaid(payout: Payout): void {
    const data: ActionDialogData = {
      title: `Pix de ${payout.paidAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} feito?`,
      message: `Confirme só depois de fazer o Pix para ${payout.affiliateName} (chave ${this.store.pixOf(payout.affiliateEmail)}). Fica registrado com seu nome.`,
      confirmLabel: 'Marcar como pago',
    };
    this.dialog
      .open(ActionDialog, { data, width: '440px' })
      .afterClosed()
      .subscribe((ok) => {
        if (ok && this.store.markPaid(payout)) {
          this.snackBar.open('Pagamento marcado como pago.', 'Fechar', { duration: 3000 });
        }
      });
  }
}
