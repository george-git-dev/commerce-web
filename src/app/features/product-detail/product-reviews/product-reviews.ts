import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Product } from '../../../core/models/product';
import { ProductReview } from '../../../core/models/review';
import { CatalogService } from '../../../core/services/catalog-service';
import { StarRating } from '../../../shared/star-rating/star-rating';

/**
 * Seção "Avaliações" da página do produto: resumo (média, total, barras por
 * nota) e lista paginada com "Ver mais". Só mostra avaliações aprovadas de
 * compras verificadas — a regra é do back.
 */
@Component({
  selector: 'app-product-reviews',
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatIconModule, StarRating],
  templateUrl: './product-reviews.html',
  styleUrl: './product-reviews.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductReviews {
  private readonly catalog = inject(CatalogService);

  readonly product = input.required<Product>();

  /** Páginas já carregadas; volta para 1 quando o produto muda. */
  private readonly pagesLoaded = linkedSignal<Product, number>({
    source: this.product,
    computation: () => 1,
  });

  private readonly pages = computed(() =>
    Array.from({ length: this.pagesLoaded() }, (_, page) =>
      this.catalog.reviews(this.product(), page),
    ),
  );

  protected readonly summary = computed(() => this.pages()[0].summary);
  protected readonly reviews = computed<readonly ProductReview[]>(() =>
    this.pages().flatMap((page) => page.items),
  );
  protected readonly hasMore = computed(() => this.pages().at(-1)?.hasMore ?? false);

  /** Barras de 5 a 1 estrela, com a porcentagem de cada nota. */
  protected readonly bars = computed(() => {
    const { distribution, count } = this.summary();
    return [5, 4, 3, 2, 1].map((stars) => {
      const total = distribution[stars - 1] ?? 0;
      return { stars, total, percent: count ? Math.round((total / count) * 100) : 0 };
    });
  });

  protected loadMore(): void {
    this.pagesLoaded.update((pages) => pages + 1);
  }
}
