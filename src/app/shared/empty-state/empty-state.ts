import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/** Estado vazio reutilizado por catálogo, carrinho e favoritos. */
@Component({
  selector: 'app-empty-state',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly ctaLabel = input<string>();
  /** Navega para uma rota. Omitir e usar `ctaClick` quando a ação deve ficar na própria página. */
  readonly ctaLink = input<string>();
  readonly ctaClick = output<void>();
}
