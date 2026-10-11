import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FreeShippingEditor } from '../storefront/free-shipping-editor';
import { StorefrontTabs } from '../storefront/storefront-tabs';

/**
 * `/admin/vitrine/configuracoes` (aba da Vitrine; o antigo `/admin/configuracoes`
 * redireciona) — regras comerciais da loja. Por enquanto, a promoção de frete
 * grátis (a mesma que abre pelo aviso, na aba Avisos). Fase 2:
 * `PUT /admin/settings`; o back usa a mesma regra ao calcular o pedido.
 */
@Component({
  selector: 'app-admin-settings',
  imports: [FreeShippingEditor, StorefrontTabs],
  template: `
    <section class="vf">
      <app-storefront-tabs />
      <div class="vf__card">
        <h3>Frete grátis</h3>
        <app-free-shipping-editor />
      </div>
    </section>
  `,
  styleUrls: ['../storefront/storefront-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettings {}
