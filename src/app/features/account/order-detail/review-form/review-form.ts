import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrderItem } from '../../../../core/models/order';
import {
  REVIEW_COMMENT_MAX,
  REVIEW_COMMENT_MIN,
  ReviewService,
} from '../../../../core/services/review-service';

/** Formulário de avaliação de um item entregue: estrelas (1–5) + comentário. */
@Component({
  selector: 'app-review-form',
  imports: [MatButtonModule, MatIconModule, ReactiveFormsModule],
  templateUrl: './review-form.html',
  styleUrl: './review-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewForm {
  private readonly reviews = inject(ReviewService);
  private readonly snackBar = inject(MatSnackBar);

  readonly orderNumber = input.required<string>();
  readonly item = input.required<OrderItem>();
  readonly sent = output();

  protected readonly min = REVIEW_COMMENT_MIN;
  protected readonly max = REVIEW_COMMENT_MAX;
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly rating = signal(0);
  protected readonly ratingError = signal(false);
  protected readonly comment = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.minLength(REVIEW_COMMENT_MIN),
      Validators.maxLength(REVIEW_COMMENT_MAX),
    ],
  });

  protected setRating(value: number): void {
    this.rating.set(value);
    this.ratingError.set(false);
  }

  protected submit(): void {
    this.ratingError.set(this.rating() === 0);
    if (this.ratingError() || this.comment.invalid) {
      this.comment.markAsTouched();
      return;
    }
    this.reviews.submit({
      orderNumber: this.orderNumber(),
      itemId: this.item().id,
      slug: this.item().slug,
      productName: this.item().productName,
      variantLabel: this.item().variantLabel,
      rating: this.rating(),
      comment: this.comment.value.trim(),
    });
    this.snackBar.open(
      'Recebemos sua avaliação! Ela aparece no produto depois da moderação.',
      'Fechar',
      { duration: 4000 },
    );
    this.sent.emit();
  }
}
