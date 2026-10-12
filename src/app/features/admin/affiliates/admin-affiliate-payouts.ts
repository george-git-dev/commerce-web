import { CurrencyPipe, DatePipe } from '@angular/common';
import { CouponTicket } from '../../../shared/coupon-ticket/coupon-ticket';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { Affiliate } from '../../../core/models/affiliate';
import { CommissionStatus } from '../../../core/models/commission';
import { AffiliateService } from '../../../core/services/affiliate-service';
import { COMMISSION_STATUS_LABELS } from '../../../core/utils/commission-rules';
import { AdminCommissions } from '../services/admin-commissions';
import { AdminOrderStore } from '../services/admin-order-store';
import { ListMemory } from '../services/list-memory';
import { AffiliateRequests } from './affiliate-requests';
import { PayoutDialog } from './payout-dialog';
import { EditAffiliateDialog } from './edit-affiliate-dialog';
import { ProgramSettings } from './program-settings';
import { AdminAffiliates } from '../services/admin-affiliates';
import { Pager } from '../shared/pager/pager';
import { Paging } from '../shared/pager/paging';

type Tab = 'pedidos' | 'afiliados' | 'comissoes' | 'pagamentos' | 'configuracoes';
type AffiliateFilter = 'todos' | 'a-pagar' | 'pix' | 'credito' | 'sem-vendas';
type AffiliateSort = 'vendas' | 'a-pagar' | 'nome' | 'recentes';

const AFFILIATE_FILTERS: readonly { id: AffiliateFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'a-pagar', label: 'Com valor a pagar' },
  { id: 'pix', label: 'Recebe por Pix' },
  { id: 'credito', label: 'Recebe em crédito' },
  { id: 'sem-vendas', label: 'Sem vendas' },
];

const AFFILIATE_SORTS: readonly { id: AffiliateSort; label: string }[] = [
  { id: 'vendas', label: 'Mais vendas (R$)' },
  { id: 'a-pagar', label: 'Maior valor a pagar' },
  { id: 'nome', label: 'Nome (A–Z)' },
  { id: 'recentes', label: 'Aprovados mais recentes' },
];

const br = (iso: string) => iso.split('-').reverse().join('/');

function createState() {
  const tab = signal<Tab>('afiliados');
  const status = signal<CommissionStatus | 'todas'>('todas');
  const affiliate = signal('');
  const search = signal('');
  const show = signal<AffiliateFilter>('todos');
  const sort = signal<AffiliateSort>('vendas');
  return {
    tab,
    status,
    affiliate,
    search,
    show,
    sort,
    paging: new Paging(() => `${tab()}|${status()}|${affiliate()}|${search()}|${show()}|${sort()}`),
  };
}

/**
 * `/admin/afiliados` — pedidos para entrar no programa (aprovar/recusar),
 * afiliados aprovados (vendas, totais e "Fazer pagamento" por afiliado),
 * comissões e pagamentos (com o comprovante do Pix).
 */
@Component({
  selector: 'app-admin-affiliate-payouts',
  imports: [
    CouponTicket,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    Pager,
    AffiliateRequests,
    ProgramSettings,
  ],
  templateUrl: './admin-affiliate-payouts.html',
  styleUrl: './admin-affiliate-payouts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAffiliatePayouts {
  protected readonly store = inject(AdminCommissions);
  protected readonly manage = inject(AdminAffiliates);
  private readonly orders = inject(AdminOrderStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly state = inject(ListMemory).get('afiliados-pagamentos', createState);
  /** Pedidos de afiliação esperando decisão (aba Pedidos). */
  protected readonly pendingRequests = inject(AffiliateService).pendingCount;
  protected readonly tab = this.state.tab;
  protected readonly search = this.state.search;
  protected readonly show = this.state.show;
  protected readonly sort = this.state.sort;
  protected readonly affiliateFilters = AFFILIATE_FILTERS;
  protected readonly affiliateSorts = AFFILIATE_SORTS;
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
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'afiliados', label: 'Afiliados' },
    { id: 'comissoes', label: 'Comissões' },
    { id: 'pagamentos', label: 'Pagamentos' },
    { id: 'configuracoes', label: 'Configurações' },
  ];

  /** Afiliados aprovados com busca (nome, @, cupom), filtro e ordem. */
  protected readonly affiliates = computed(() => {
    const term = this.search().trim().toLocaleLowerCase('pt-BR');
    const show = this.show();
    const rows = this.store
      .rows()
      .map((row) => ({ ...row, toPay: this.store.preview(row.affiliate).paidAmount }))
      .filter(
        (row) =>
          !term ||
          `${row.affiliate.name} ${row.affiliate.profile} ${row.affiliate.couponCode ?? ''}`
            .toLocaleLowerCase('pt-BR')
            .includes(term),
      )
      .filter((row) => {
        switch (show) {
          case 'a-pagar':
            return row.toPay > 0;
          case 'pix':
          case 'credito':
            return row.affiliate.payoutMethod === show;
          case 'sem-vendas':
            return row.sales === 0;
          default:
            return true;
        }
      });
    const byName = (a: string, b: string) => a.localeCompare(b, 'pt-BR');
    switch (this.sort()) {
      case 'a-pagar':
        return rows.sort((a, b) => b.toPay - a.toPay);
      case 'nome':
        return rows.sort((a, b) => byName(a.affiliate.name, b.affiliate.name));
      case 'recentes':
        return rows.sort(
          (a, b) =>
            (b.affiliate.decision?.at.getTime() ?? 0) - (a.affiliate.decision?.at.getTime() ?? 0),
        );
      default:
        return rows.sort((a, b) => b.revenue - a.revenue);
    }
  });
  protected readonly affiliatePage = computed(() => this.paging.of(this.affiliates()));

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

  /** Mais recentes primeiro. */
  protected readonly payouts = computed(() =>
    [...this.store.payouts()]
      .filter((p) => !this.affiliate() || p.affiliateEmail === this.affiliate())
      .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime()),
  );
  protected readonly payoutPage = computed(() => this.paging.of(this.payouts()));

  constructor() {
    // Tem gente esperando aprovação: abre direto na aba de pedidos.
    if (this.pendingRequests()) this.tab.set('pedidos');
  }

  protected orderExists(number: string): boolean {
    return !!this.orders.find(number);
  }

  /** Situação da participação: no ar, pausado ou fora do período. */
  protected situation(affiliate: Affiliate): string | null {
    if (!affiliate.active) return 'Pausado';
    const today = new Date().toISOString().slice(0, 10);
    if (affiliate.startsOn && today < affiliate.startsOn)
      return 'Começa em ' + br(affiliate.startsOn);
    if (affiliate.endsOn && today > affiliate.endsOn) return 'Período encerrado';
    return null;
  }

  protected discountOf(affiliate: Affiliate): number | null {
    return this.manage.couponOf(affiliate)?.value ?? null;
  }

  protected edit(affiliate: Affiliate): void {
    this.dialog
      .open(EditAffiliateDialog, { data: affiliate, width: '520px', maxWidth: '94vw' })
      .afterClosed()
      .subscribe((done?: boolean) => {
        if (!done) return;
        this.snackBar.open(`${affiliate.name} atualizado.`, 'Fechar', { duration: 3500 });
      });
  }

  protected pay(affiliate: Affiliate): void {
    this.dialog
      .open(PayoutDialog, { data: affiliate, width: '480px', maxWidth: '94vw' })
      .afterClosed()
      .subscribe((done?: boolean) => {
        if (!done) return;
        this.snackBar.open(`Pagamento de ${affiliate.name} registrado.`, 'Fechar', {
          duration: 3500,
        });
      });
  }
}
