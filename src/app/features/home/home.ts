import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Seo } from '../../core/seo/seo';
import { storeJsonLd } from '../../core/seo/structured-data';
import { CatalogService } from '../../core/services/catalog-service';
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
  private readonly catalog = inject(CatalogService);

  protected readonly featured = computed(() => this.catalog.products().slice(0, 4));
  protected readonly bestsellers = computed(() =>
    [...this.catalog.products()].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 4),
  );

  constructor() {
    // Dados da loja para o Google (nome, logo, redes). Título e descrição são os padrões.
    const seo = inject(Seo);
    effect(() => seo.update({ jsonLd: storeJsonLd() }, '/'));
  }
}
