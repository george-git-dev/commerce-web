import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SECTION_IDS } from '../../../../core/config/navigation';
import { STORE_CONFIG } from '../../../../core/config/store-config';

@Component({
  selector: 'app-cta-section',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './cta-section.html',
  styleUrl: './cta-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CtaSection {
  protected readonly store = STORE_CONFIG;
  protected readonly sections = SECTION_IDS;
}
