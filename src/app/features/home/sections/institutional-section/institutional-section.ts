import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { IMAGERY } from '../../../../core/config/imagery';
import { HOME_SECTION_IDS } from '../../../../core/config/navigation';
import { STORE_CONFIG } from '../../../../core/config/store-config';

@Component({
  selector: 'app-institutional-section',
  imports: [MatButtonModule],
  templateUrl: './institutional-section.html',
  styleUrl: './institutional-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitutionalSection {
  protected readonly sections = HOME_SECTION_IDS;
  protected readonly imagery = IMAGERY;
  protected readonly store = STORE_CONFIG;
}
