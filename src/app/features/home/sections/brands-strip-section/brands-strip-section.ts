import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BRANDS } from '../../../../core/config/brands';

@Component({
  selector: 'app-brands-strip-section',
  templateUrl: './brands-strip-section.html',
  styleUrl: './brands-strip-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandsStripSection {
  protected readonly brands = BRANDS;
}