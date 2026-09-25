import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MOCK_PRODUCTS } from '../../core/data/mock-products';
import { BrandsStripSection } from './sections/brands-strip-section/brands-strip-section';
import { CategoriesSection } from './sections/categories-section/categories-section';
import { BannerCarousel } from './sections/banner-carousel/banner-carousel';
import { HighlightsSection } from './sections/highlights-section/highlights-section';
import { InstitutionalSection } from './sections/institutional-section/institutional-section';
import { NewsletterSection } from './sections/newsletter-section/newsletter-section';
import { ProductsSection } from './sections/products-section/products-section';

@Component({
  selector: 'app-home',
  imports: [
    BannerCarousel,
    CategoriesSection,
    ProductsSection,
    HighlightsSection,
    BrandsStripSection,
    InstitutionalSection,
    NewsletterSection,
  ],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  // Dado mockado enquanto o visual não é validado — ver `mock-products.ts`.
  protected readonly featured = MOCK_PRODUCTS.slice(0, 4);
  protected readonly bestsellers = [...MOCK_PRODUCTS]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 4);
}
