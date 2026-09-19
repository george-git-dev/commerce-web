import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

type StarState = 'star' | 'star_half' | 'star_border';

/** Estrelas somente leitura — usado no card de produto e no detalhe. */
@Component({
  selector: 'app-star-rating',
  imports: [MatIconModule],
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarRating {
  readonly rating = input.required<number>();
  readonly reviews = input<number>();

  protected readonly stars = computed<readonly StarState[]>(() => {
    const value = this.rating();
    return Array.from({ length: 5 }, (_, i) => {
      const diff = value - i;
      if (diff >= 0.75) return 'star';
      if (diff >= 0.25) return 'star_half';
      return 'star_border';
    });
  });
}
