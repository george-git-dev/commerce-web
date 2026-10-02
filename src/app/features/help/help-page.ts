import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HELP_GROUP_LABELS, HELP_PAGES } from '../../core/config/help-pages';
import { STORE_CONFIG } from '../../core/config/store-config';

/** `/ajuda/:pagina` — uma página genérica para ajuda, políticas e contato. */
@Component({
  selector: 'app-help-page',
  imports: [DatePipe, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './help-page.html',
  styleUrl: './help-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpPageView {
  private readonly route = inject(ActivatedRoute);
  private readonly paramMap = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly store = STORE_CONFIG;
  protected readonly page = computed(() =>
    HELP_PAGES.find((page) => page.slug === this.paramMap().get('pagina')),
  );
  protected readonly groupLabel = computed(() => {
    const page = this.page();
    return page ? HELP_GROUP_LABELS[page.group] : '';
  });
}
