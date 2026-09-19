import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

interface AccountCard {
  icon: string;
  title: string;
  description: string;
  link?: string;
}

/**
 * `/minha-conta`. Só o card de Favoritos linka de verdade — os demais dependem
 * de autenticação e histórico de pedidos reais (Etapas 3/5/6 do roadmap).
 */
@Component({
  selector: 'app-account',
  imports: [MatIconModule, RouterLink],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Account {
  protected readonly cards: readonly AccountCard[] = [
    {
      icon: 'local_shipping',
      title: 'Pedidos',
      description: 'Acompanhe entregas e veja seu histórico de compras.',
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
    },
    {
      icon: 'person',
      title: 'Dados pessoais',
      description: 'Atualize nome, e-mail e telefone de contato.',
    },
  ];
}
