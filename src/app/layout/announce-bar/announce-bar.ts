import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorefrontContent } from '../../core/services/storefront-content';

/** Faixa de anúncios no topo do header, rolando de ponta a ponta. */
@Component({
  selector: 'app-announce-bar',
  imports: [RouterLink],
  templateUrl: './announce-bar.html',
  styleUrl: './announce-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnounceBar {
  /** Avisos no ar (frete grátis + Vitrine → Avisos no backoffice). */
  protected readonly items = inject(StorefrontContent).announcements;
  /** Repetida para a faixa cobrir telas largas sem buraco. */
  protected readonly announcements = computed(() =>
    Array.from({ length: 4 }, () => this.items()).flat(),
  );
}
