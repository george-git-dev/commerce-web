import { CurrencyPipe, DatePipe } from '@angular/common';
import { CouponTicket } from '../../../shared/coupon-ticket/coupon-ticket';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import {
  AFFILIATE_CHANNELS,
  AFFILIATE_PROGRAM,
  AffiliateChannel,
} from '../../../core/config/affiliate';
import { PAYOUT_METHOD_LABELS, PayoutMethod } from '../../../core/models/commission';
import { AffiliateService } from '../../../core/services/affiliate-service';
import { CommissionService } from '../../../core/services/commission-service';
import {
  COMMISSION_STATUS_LABELS,
  commissionStatus,
  commissionTotals,
  paidAmount,
} from '../../../core/utils/commission-rules';
import {
  AFFILIATE_STATUS_LABELS,
  affiliateDraftProblems,
  PITCH_MAX,
} from '../../../core/utils/affiliate-rules';

/**
 * `/minha-conta/afiliado` — pedir para participar, acompanhar o pedido e, já
 * afiliado, o cupom para divulgar. Vendas e comissões entram aqui (sessão 2).
 */
@Component({
  selector: 'app-affiliate-area',
  imports: [CouponTicket, CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './affiliate-area.html',
  styleUrl: './affiliate-area.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AffiliateArea {
  protected readonly affiliates = inject(AffiliateService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly program = AFFILIATE_PROGRAM;
  protected readonly channels = AFFILIATE_CHANNELS;
  protected readonly labels = AFFILIATE_STATUS_LABELS;
  protected readonly pitchMax = PITCH_MAX;

  protected readonly mine = this.affiliates.mine;
  private readonly commissionService = inject(CommissionService);
  protected readonly statusLabels = COMMISSION_STATUS_LABELS;
  protected readonly methodLabels = PAYOUT_METHOD_LABELS;
  protected readonly status = (c: Parameters<typeof commissionStatus>[0]) =>
    commissionStatus(c, this.commissionService.now());

  /** Vendas com o cupom (sem dado de quem comprou: só data, valor e situação). */
  protected readonly sales = this.commissionService.mine;
  protected readonly payouts = this.commissionService.myPayouts;
  protected readonly totals = computed(() =>
    commissionTotals(this.sales(), this.commissionService.now()),
  );
  /** Recebido de fato: Pix feitos e créditos lançados. */
  protected readonly received = computed(() =>
    this.payouts().reduce((sum, p) => Math.round((sum + p.paidAmount) * 100) / 100, 0),
  );
  protected readonly salesShown = signal(10);
  /** Quanto o liberado vira em cada forma (para a escolha). */
  protected readonly preview = computed(() => ({
    pix: paidAmount(this.totals().liberada, 'pix'),
    credito: paidAmount(this.totals().liberada, 'credito'),
  }));

  protected readonly isCredit = (p: { method: PayoutMethod }) => p.method === 'credito';

  protected setMethod(method: PayoutMethod): void {
    this.affiliates.setPayoutMethod(method);
    this.snackBar.open(
      method === 'credito'
        ? `Próximo pagamento em crédito na loja (+${this.program.storeCreditBonusPercent}%).`
        : 'Próximo pagamento por Pix.',
      'Fechar',
      { duration: 3000 },
    );
  }
  protected readonly block = computed(() => {
    this.mine();
    return this.affiliates.applyBlock();
  });
  /** Mostra o formulário: nunca pediu, ou pode pedir de novo. */
  protected readonly showForm = computed(() => !this.block());

  protected readonly channel = signal<AffiliateChannel>('Instagram');
  protected readonly profile = signal('');
  protected readonly pitch = signal('');
  protected readonly pixKey = signal('');
  protected readonly terms = signal(false);
  protected readonly tried = signal(false);
  protected readonly problems = computed(() =>
    affiliateDraftProblems(
      {
        channel: this.channel(),
        profile: this.profile(),
        pitch: this.pitch(),
        pixKey: this.pixKey(),
      },
      this.terms(),
    ),
  );

  /** Texto pronto para compartilhar no WhatsApp. */
  protected readonly shareHref = computed(() => {
    const code = this.mine()?.couponCode;
    if (!code) return '';
    const text = `Use o meu cupom ${code} e ganhe ${this.program.buyerDiscountPercent}% de desconto em perfumes árabes na Nani Perfumes: ${globalThis.location?.origin ?? ''}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  });

  protected submit(): void {
    this.tried.set(true);
    if (this.problems().length) return;
    const result = this.affiliates.apply(
      {
        channel: this.channel(),
        profile: this.profile(),
        pitch: this.pitch(),
        pixKey: this.pixKey(),
      },
      this.terms(),
    );
    if (!result.ok) {
      this.snackBar.open(result.message, 'Fechar', { duration: 4000 });
      return;
    }
    this.tried.set(false);
    this.snackBar.open('Pedido enviado! Avisamos por e-mail quando for analisado.', 'Fechar', {
      duration: 5000,
    });
  }

  protected async copy(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.snackBar.open('Cupom copiado.', 'Fechar', { duration: 2500 });
    } catch {
      this.snackBar.open(`Copie o cupom: ${code}`, 'Fechar', { duration: 4000 });
    }
  }
}
