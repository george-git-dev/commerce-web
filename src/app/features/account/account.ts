import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

  protected readonly cards: readonly AccountCard[] = [
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
  ];
}
