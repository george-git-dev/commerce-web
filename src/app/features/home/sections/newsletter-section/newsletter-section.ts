import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Só visual — não há back-end de newsletter nesta fase. */
@Component({
  selector: 'app-newsletter-section',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './newsletter-section.html',
  styleUrl: './newsletter-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsletterSection {
  protected readonly email = signal('');
  protected readonly subscribed = signal(false);

  protected subscribe(): void {
    if (!this.email().trim()) {
      return;
    }
    this.subscribed.set(true);
    this.email.set('');
  }
}
