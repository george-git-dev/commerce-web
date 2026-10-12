import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AffiliateService } from '../../../core/services/affiliate-service';
import { ReviewService } from '../../../core/services/review-service';

/** Abas de Aprovações: Avaliações · Afiliados (com o número de pendentes). */
@Component({
  selector: 'app-approvals-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="tabs__head">
      <p class="tabs__eyebrow">Gestão da loja</p>
      <h2>Aprovações</h2>
      <p class="tabs__lead">
        O que precisa de alguém da equipe antes de aparecer ou valer na loja.
      </p>
    </header>
    <nav class="tabs" aria-label="Tipo de aprovação">
      <a
        routerLink="/admin/aprovacoes"
        routerLinkActive="tabs--on"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
      >
        Avaliações
        @if (reviews.pendingCount(); as count) {
          <span class="tabs__count">{{ count }}</span>
        }
      </a>
      <a
        routerLink="/admin/aprovacoes/afiliados"
        routerLinkActive="tabs--on"
        ariaCurrentWhenActive="page"
      >
        Afiliados
        @if (affiliates.pendingCount(); as count) {
          <span class="tabs__count">{{ count }}</span>
        }
      </a>
    </nav>
  `,
  styleUrl: '../storefront/tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalsTabs {
  protected readonly reviews = inject(ReviewService);
  protected readonly affiliates = inject(AffiliateService);
}
