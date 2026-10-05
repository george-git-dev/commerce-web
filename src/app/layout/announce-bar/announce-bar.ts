import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ANNOUNCEMENTS } from '../../core/config/store-config';

/** Faixa de anúncios no topo do header, rolando de ponta a ponta. */
@Component({
  selector: 'app-announce-bar',
  templateUrl: './announce-bar.html',
  styleUrl: './announce-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnounceBar {
  /** Repetida para a faixa cobrir telas largas sem buraco. */
  protected readonly announcements = Array.from({ length: 4 }, () => ANNOUNCEMENTS).flat();
}
