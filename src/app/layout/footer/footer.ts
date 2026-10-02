import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HELP_GROUP_LABELS, HELP_PAGES } from '../../core/config/help-pages';
import { HOME_SECTION_IDS } from '../../core/config/navigation';
import { HelpGroup } from '../../core/models/help-page';
import { SOCIAL_LINKS, STORE_CONFIG } from '../../core/config/store-config';
import { BrandIcon } from '../../shared/brand-icon/brand-icon';
import { FooterTrust } from './footer-trust/footer-trust';

interface FooterLink {
  label: string;
  path: string;
  fragment?: string;
}

const helpLinks = (group: HelpGroup): FooterLink[] =>
  HELP_PAGES.filter((page) => page.group === group).map((page) => ({
    label: page.title,
    path: `/ajuda/${page.slug}`,
  }));

@Component({
  selector: 'app-footer',
  imports: [MatIconModule, RouterLink, BrandIcon, FooterTrust],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly store = STORE_CONFIG;
  protected readonly socials = SOCIAL_LINKS;
  protected readonly year = new Date().getFullYear();

  /**
   * Celular: cada grupo é um acordeão fechado (rodapé curto).
   * A partir de 900px ficam todos abertos, em colunas.
   */
  protected readonly wide = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 900px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected readonly groups: readonly { title: string; links: readonly FooterLink[] }[] = [
    {
      title: HELP_GROUP_LABELS.institucional,
      links: [
        { label: 'Nossa história', path: '/', fragment: HOME_SECTION_IDS.story },
        { label: 'Minha conta', path: '/minha-conta' },
        { label: 'Favoritos', path: '/favoritos' },
        ...helpLinks('institucional'),
      ],
    },
    { title: HELP_GROUP_LABELS.suporte, links: helpLinks('suporte') },
    { title: HELP_GROUP_LABELS.politicas, links: helpLinks('politicas') },
  ];
}
