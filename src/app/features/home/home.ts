import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Seo } from '../../core/seo/seo';
import { storeJsonLd } from '../../core/seo/structured-data';
import { CatalogService } from '../../core/services/catalog-service';
import { CatalogQuery, EMPTY_CATALOG_QUERY } from '../../core/utils/catalog-search';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
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

  /** Vitrines da home: a mesma busca do catálogo (no login de verdade, o back escolhe e ordena). */
  // Destaques = lançamentos até existir a curadoria manual no backoffice de produtos.
  protected readonly featured = this.showcase({ launch: true });
  protected readonly bestsellers = this.showcase({ sort: 'mais-vendidos' });

  private showcase(query: Partial<CatalogQuery>) {
    const page = toSignal(
      this.catalog
        .search({ ...EMPTY_CATALOG_QUERY, ...query, size: 4 })
        .pipe(catchError(() => of(null))),
      { initialValue: null },
    );
    return computed(() => page()?.items ?? []);
  }

  constructor() {
    // Dados da loja para o Google (nome, logo, redes). Título e descrição são os padrões.
    const seo = inject(Seo);
    effect(() => seo.update({ jsonLd: storeJsonLd() }, '/'));
  }
}
