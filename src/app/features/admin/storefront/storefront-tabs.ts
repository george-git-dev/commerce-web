import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Abas da Vitrine: Banners (carrossel da home) · Avisos (faixa do topo). */
@Component({
  selector: 'app-storefront-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="tabs__head">
      <p class="tabs__eyebrow">Gestão da loja</p>
      <h2>Vitrine</h2>
      <p class="tabs__lead">
        O que a loja mostra na home e na faixa do topo — muda na hora, sem deploy.
      </p>
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
    </nav>
  `,
  styles: `
    :host {
      display: grid;
      gap: 12px;
    }

    .tabs__head {
      display: grid;
      gap: 4px;
    }

    h2 {
      margin: 0;
      font-size: clamp(1.75rem, 1.4rem + 1.6vw, 2.5rem);
    }

    .tabs__eyebrow {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--gold);
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      overflow-x: auto;
      scrollbar-width: none;

      a {
        display: inline-flex;
        flex: 1 0 auto;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 44px;
        padding: 0 14px;
        border-bottom: 3px solid transparent;
        color: var(--muted-foreground);
        font-size: 0.9375rem;
        white-space: nowrap;
      }

      .tabs--on {
        border-color: var(--primary);
        color: var(--foreground);
        font-weight: 600;
      }
    }

    .tabs__lead {
      margin: 0;
      font-size: 0.875rem;
      color: var(--muted-foreground);
    }

    @media (min-width: 700px) {
      .tabs a {
        flex: 0 0 auto;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontTabs {}
