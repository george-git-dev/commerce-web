import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { HOME_SECTION_IDS, NAV_LINKS } from '../../core/config/navigation';
import { SOCIAL_LINKS, STORE_CONFIG } from '../../core/config/store-config';

@Component({
  selector: 'app-footer',
  imports: [MatIconModule, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly store = STORE_CONFIG;
  protected readonly sections = HOME_SECTION_IDS;
  protected readonly socials = SOCIAL_LINKS;
  protected readonly year = new Date().getFullYear();

  // Categorias reaproveita o mesmo contrato de filtro do header — um único lugar
  // decide o que cada rótulo filtra em `/produtos`.
  protected readonly categoryLinks = NAV_LINKS.filter((link) => link.label !== 'Início');

  protected readonly payments = ['Visa', 'Mastercard', 'Elo', 'Pix', 'Boleto'];
}
