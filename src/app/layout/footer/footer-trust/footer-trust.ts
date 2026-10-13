import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PAYMENT_METHODS } from '../../../core/config/store-config';
import { BrandIcon } from '../../../shared/brand-icon/brand-icon';

/**
 * Faixa "Formas de pagamento" + "Segurança" do rodapé.
 * Selos de segurança: só o que é verdade quando o site estiver no ar (HTTPS e
 * pagamento pelo gateway). Selo de terceiros só com a certificação de fato.
 */
@Component({
  selector: 'app-footer-trust',
  imports: [MatIconModule, BrandIcon],
  templateUrl: './footer-trust.html',
  styleUrl: './footer-trust.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterTrust {
  protected readonly payments = PAYMENT_METHODS;
}
