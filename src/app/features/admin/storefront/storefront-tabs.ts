import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { ReviewService } from '../../../core/services/review-service';

/**
 * Abas da Vitrine: Banners (carrossel da home) · Avisos (faixa do topo) ·
 * Avaliações (moderação do que os clientes escrevem) · Configurações (frete
 * grátis e aviso na faixa).
 * Segredo (chave de gateway, frete, e-mail) nunca vem para cá: fica no back.
 */
@Component({
  selector: 'app-storefront-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="tabs__head">
      <p class="tabs__eyebrow">Gestão da loja</p>
      <h2>Vitrine</h2>
      <p class="tabs__lead">O que a loja mostra e as regras dela — muda na hora, sem deploy.</p>
    </header>
    <nav class="tabs" aria-label="Vitrine">
      <a
        routerLink="/admin/vitrine"
        routerLinkActive="tabs--on"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
        >Banners</a
      >
      <a routerLink="/admin/vitrine/avisos" routerLinkActive="tabs--on" ariaCurrentWhenActive="page"
        >Avisos</a
      >
      @if (canModerate()) {
        <a
          routerLink="/admin/vitrine/avaliacoes"
          routerLinkActive="tabs--on"
          ariaCurrentWhenActive="page"
        >
          Avaliações
          @if (reviews.pendingCount(); as count) {
            <span class="tabs__count" [attr.aria-label]="count + ' pendentes'">{{ count }}</span>
          }
        </a>
      }
      <a
        routerLink="/admin/vitrine/configuracoes"
        routerLinkActive="tabs--on"
        ariaCurrentWhenActive="page"
        >Configurações</a
      >
    </nav>
  `,
  styleUrl: './tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontTabs {
  protected readonly reviews = inject(ReviewService);
  /** Avaliações: moderação tem permissão própria (`approvals:view`). */
  private readonly auth = inject(AuthService);
  protected readonly canModerate = computed(() => this.auth.can('approvals:view'));
}
