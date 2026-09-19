import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MOCK_PRODUCTS } from '../../../../core/data/mock-products';

@Component({
  selector: 'app-brands-strip-section',
  templateUrl: './brands-strip-section.html',
  styleUrl: './brands-strip-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandsStripSection {
  protected readonly brands = [...new Set(MOCK_PRODUCTS.map((product) => product.brandName))];
}
