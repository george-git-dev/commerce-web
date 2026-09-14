import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { NAV_LINKS } from '../../core/config/navigation';
import { STORE_CONFIG } from '../../core/config/store-config';
import { CartStore } from '../../core/services/cart-store';

@Component({
  selector: 'app-header',
  imports: [MatBadgeModule, MatButtonModule, MatIconModule, MatToolbarModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected readonly store = STORE_CONFIG;
  protected readonly navLinks = NAV_LINKS;
  protected readonly cart = inject(CartStore);
  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
