import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CreditEntry } from '../../../core/models/commission';
import { StoreCredit } from '../../../core/services/store-credit';

const KIND_LABELS: Record<CreditEntry['kind'], string> = {
  comissao: 'Comissão de afiliado',
  uso: 'Usado no pedido',
  estorno: 'Devolvido (pedido cancelado)',
};

/** `/minha-conta/credito` — saldo e extrato do crédito na loja. Fase 2: `GET /me/store-credit`. */
@Component({
  selector: 'app-store-credit-page',
  imports: [CurrencyPipe, DatePipe, MatIconModule, RouterLink],
  templateUrl: './store-credit-page.html',
  styleUrl: './store-credit-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreCreditPage {
  protected readonly credit = inject(StoreCredit);
  protected readonly labels = KIND_LABELS;
}
