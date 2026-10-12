import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Abas da Vitrine: Banners (carrossel da home) · Avisos (faixa do topo) ·
 * Configurações (frete grátis e, depois, contato, redes e dados da empresa).
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
export class StorefrontTabs {}
