import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ROLE_LABELS } from '../../../core/config/permissions';
import { AuthService } from '../../../core/services/auth-service';
import { ADMIN_NAV } from '../admin-nav';
import { AdminDashboard } from '../services/admin-dashboard';

/**
 * Moldura do backoffice. Celular: barra no topo, menu em gaveta e atalhos fixos
 * embaixo. Desktop (≥1024px): menu lateral fixo. Só mostra o que o perfil pode ver.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly pendingApprovals = inject(AdminDashboard).pendingApprovals;

  protected readonly desktop = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 1024px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  protected readonly menuOpen = signal(false);

  protected readonly items = computed(() => {
    this.auth.user();
    return ADMIN_NAV.filter((item) => this.auth.can(item.permission));
  });
  protected readonly shortcuts = computed(() => this.items().filter((item) => item.shortcut));

  /** Perfis da equipe (sem "Cliente", que todo mundo tem). */
  protected readonly roleLabel = computed(
    () =>
      (this.auth.user()?.roles ?? [])
        .filter((role) => role !== 'ROLE_CUSTOMER')
        .map((role) => ROLE_LABELS[role])
        .join(' · ') || 'Equipe',
  );

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Título da barra do topo = item de menu da página atual. */
  protected readonly pageTitle = computed(() => {
    const path = this.url()
      .split('?')[0]
      .replace(/^\/admin\/?/, '')
      .split('/')[0];
    return ADMIN_NAV.find((item) => item.path === path)?.label ?? 'Painel de vendas';
  });

  protected link(path: string): string {
    return path ? `/admin/${path}` : '/admin';
  }

  protected closeMenuOnMobile(): void {
    if (!this.desktop()) this.menuOpen.set(false);
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
