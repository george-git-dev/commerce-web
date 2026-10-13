import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { StoreCredit } from '../../core/services/store-credit';
import { AffiliateProgram } from '../../core/services/affiliate-program';
import { AffiliateService } from '../../core/services/affiliate-service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth-service';

interface AccountCard {
  icon: string;
  title: string;
  description: string;
  link?: string;
}

const CARDS: readonly AccountCard[] = [
  {
    icon: 'local_shipping',
    title: 'Pedidos',
    description: 'Acompanhe entregas e veja seu histórico de compras.',
    link: '/minha-conta/pedidos',
  },
  {
    icon: 'favorite_border',
    title: 'Favoritos',
    description: 'Reveja os perfumes que você guardou para depois.',
    link: '/favoritos',
  },
  {
    icon: 'location_on',
    title: 'Endereços',
    description: 'Gerencie os endereços de entrega da sua conta.',
    link: '/minha-conta/enderecos',
  },
  {
    icon: 'person',
    title: 'Dados pessoais',
    description: 'Atualize nome, celular e senha.',
    link: '/minha-conta/dados',
  },
  {
    icon: 'handshake',
    title: 'Afiliado',
    description: 'Divulgue a Nani com seu cupom e ganhe a cada venda.',
    link: '/minha-conta/afiliado',
  },
];

/** `/minha-conta`: atalhos para pedidos, favoritos, endereços e dados pessoais. */
@Component({
  selector: 'app-account',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Account {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }

  private readonly credit = inject(StoreCredit);
  private readonly affiliateLive = inject(AffiliateProgram).live;
  private readonly myAffiliate = inject(AffiliateService).mine;

  /** "Afiliado" some com o programa fora do ar — menos para quem já é afiliado (vê o histórico). */
  private readonly cards = computed<readonly AccountCard[]>(() =>
    this.affiliateLive() || this.myAffiliate()
      ? CARDS
      : CARDS.filter((card) => card.link !== '/minha-conta/afiliado'),
  );

  /** "Crédito na loja" só aparece para quem já teve crédito. */
  private readonly baseCards = computed<readonly AccountCard[]>(() =>
    this.credit.mine().length
      ? [
          ...this.cards(),
          {
            icon: 'account_balance_wallet',
            title: 'Crédito na loja',
            description: `Saldo de ${this.credit.myBalance().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para usar nas compras.`,
            link: '/minha-conta/credito',
          },
        ]
      : this.cards(),
  );

  /** Equipe ganha o atalho para o backoffice. */
  protected readonly visibleCards = computed(() =>
    this.auth.isStaff()
      ? [
          ...this.baseCards(),
          {
            icon: 'admin_panel_settings',
            title: 'Backoffice',
            description: 'Pedidos, produtos, estoque e números da loja.',
            link: '/admin',
          },
        ]
      : this.baseCards(),
  );
}
