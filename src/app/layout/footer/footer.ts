import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { NAV_LINKS, SECTION_IDS } from '../../core/config/navigation';
import { SOCIAL_LINKS, STORE_CONFIG } from '../../core/config/store-config';

@Component({
  selector: 'app-footer',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly store = STORE_CONFIG;
  protected readonly navLinks = NAV_LINKS;
  protected readonly sections = SECTION_IDS;
  protected readonly socials = SOCIAL_LINKS;
  protected readonly year = new Date().getFullYear();

  protected readonly payments = ['Visa', 'Mastercard', 'Elo', 'Pix', 'Boleto'];
}
