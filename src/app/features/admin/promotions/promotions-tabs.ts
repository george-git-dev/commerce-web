import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Abas de Promoções: preço promocional (Promoções) · código no carrinho (Cupons). */
@Component({
  selector: 'app-promotions-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="tabs__head">
      <p class="tabs__eyebrow">Gestão da loja</p>
      <h2>Promoções</h2>
      <p class="tabs__lead">
        Promoção muda o preço na loja para todo mundo; cupom vale para quem digita o código.
      </p>
    </header>
    <nav class="tabs" aria-label="Promoções">
      <a
        routerLink="/admin/promocoes"
        routerLinkActive="tabs--on"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
        >Promoções</a
      >
      <a
        routerLink="/admin/promocoes/cupons"
        routerLinkActive="tabs--on"
        ariaCurrentWhenActive="page"
        >Cupons</a
      >
    </nav>
  `,
  styleUrl: '../storefront/tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionsTabs {}
