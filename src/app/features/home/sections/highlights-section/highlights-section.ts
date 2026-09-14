import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CatalogService } from '../../../../core/services/catalog-service';

@Component({
  selector: 'app-highlights-section',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './highlights-section.html',
  styleUrl: './highlights-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HighlightsSection {
  private readonly catalog = inject(CatalogService);
  protected readonly highlights = this.catalog.highlights;
}
