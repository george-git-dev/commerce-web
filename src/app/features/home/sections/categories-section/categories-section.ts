import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { IMAGERY } from '../../../../core/config/imagery';
import { SECTION_IDS, categoryAnchorId } from '../../../../core/config/navigation';
import { CatalogService } from '../../../../core/services/catalog-service';

@Component({
  selector: 'app-categories-section',
  imports: [MatIconModule, RouterLink],
  templateUrl: './categories-section.html',
  styleUrl: './categories-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesSection {
  private readonly catalog = inject(CatalogService);

  protected readonly categories = this.catalog.categories;
  protected readonly sections = SECTION_IDS;
  protected readonly anchorId = categoryAnchorId;
  protected readonly imagery = IMAGERY;
}
