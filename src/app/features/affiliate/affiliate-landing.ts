import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AffiliateProgram } from '../../core/services/affiliate-program';
import { AffiliateService } from '../../core/services/affiliate-service';
import { AuthService } from '../../core/services/auth-service';

const AREA = '/minha-conta/afiliado';

/** `/seja-afiliado` — apresenta o programa e leva para o pedido (com login). */
@Component({
  selector: 'app-affiliate-landing',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './affiliate-landing.html',
  styleUrl: './affiliate-landing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AffiliateLanding {
  private readonly auth = inject(AuthService);
  private readonly affiliates = inject(AffiliateService);
  private readonly affiliateProgram = inject(AffiliateProgram);
  protected readonly program = this.affiliateProgram.settings;
  /** Programa fora do ar: sem convite para entrar (quem já é afiliado ainda acessa a área). */
  protected readonly paused = computed(() => !this.affiliateProgram.live());

  /** Rola até "Como funciona" (respeita o espaço do header fixo). */
  protected scrollToHow(): void {
    document
      .getElementById('como-funciona')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Sem login vai para o login e volta para o pedido; afiliado vê o cupom. */
  protected readonly cta = computed(() => {
    if (this.paused()) {
      return this.affiliates.mine()
        ? { label: 'Ir para minha área', link: AREA, params: null }
        : null;
    }
    if (!this.auth.isLoggedIn()) {
      return { label: 'Quero ser afiliado', link: '/login', params: { retorno: AREA } };
    }
    const status = this.affiliates.mine()?.status;
    return {
      label:
        status === 'aprovado'
          ? 'Ver meu cupom'
          : status === 'pendente'
            ? 'Acompanhar meu pedido'
            : 'Quero ser afiliado',
      link: AREA,
      params: null,
    };
  });
}
