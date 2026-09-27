import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink } from '@angular/router';
import { CATALOG_QUERY_PARAMS, NAV_LINKS } from '../../core/config/navigation';
import { ANNOUNCEMENTS } from '../../core/config/store-config';
import { CartStore } from '../../core/services/cart-store';
import { FavoritesStore } from '../../core/services/favorites-store';
import { AmbientSoundService } from '../../core/services/ambient-sound-service';

@Component({
  selector: 'app-header',
  imports: [MatBadgeModule, MatButtonModule, MatIconModule, MatToolbarModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  // A lista é repetida para que cada "cópia" da faixa fique mais larga que qualquer tela
  // (inclusive monitores ultrawide); senão sobra espaço vazio à direita durante o loop.
  protected readonly announcements = Array.from({ length: 4 }, () => ANNOUNCEMENTS).flat();
  protected readonly navLinks = NAV_LINKS;
  protected readonly cart = inject(CartStore);
  protected readonly favorites = inject(FavoritesStore);
  protected readonly ambientSound = inject(AmbientSoundService);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);
  protected readonly searchOpen = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly scrolled = signal(false);

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected toggleSearch(): void {
    this.searchOpen.update((open) => !open);
  }

  protected submitSearch(): void {
    const term = this.searchTerm().trim();
    this.searchOpen.set(false);
    this.router.navigate(['/produtos'], {
      queryParams: term ? { [CATALOG_QUERY_PARAMS.search]: term } : {},
    });
  }
}

