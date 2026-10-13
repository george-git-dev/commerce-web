import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { linkToText, SHOW_STATUS_LABELS, showStatus } from '../../../core/utils/storefront-rules';
import { AdminStorefront } from '../services/admin-storefront';
import { StorefrontTabs } from './storefront-tabs';

const dayLabel = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '');

/** `/admin/vitrine` — banners do carrossel da home, na ordem de exibição. */
@Component({
  selector: 'app-admin-banners',
  imports: [MatButtonModule, MatIconModule, RouterLink, StorefrontTabs],
  template: `
    <section class="vl">
      <app-storefront-tabs />
      <div class="vl__bar">
        <p>
          A home mostra os banners <strong>No ar</strong>, nesta ordem. Sem nenhum no ar, aparece o
          banner padrão.
        </p>
        @if (canEdit) {
          <a matButton="filled" class="ui-cta" routerLink="/admin/vitrine/banners/novo">
            <mat-icon>add</mat-icon> Novo banner
          </a>
        }
      </div>
      @if (rows().length) {
        <ol class="vl__list">
          @for (row of rows(); track row.banner.id; let first = $first, last = $last) {
            <li class="vl__row">
              <img class="vl__thumb" [src]="row.banner.image" alt="" width="56" height="70" />
              <a class="vl__main" [routerLink]="['/admin/vitrine/banners', row.banner.id]">
                <strong>{{ row.banner.name }}</strong>
                <span class="vl__status" [class]="'vl__status--' + row.status">
                  {{ statusLabels[row.status] }}
                </span>
                <small>{{ row.period }}</small>
                <small>{{ row.link || 'Sem link' }}</small>
              </a>
              @if (canEdit) {
                <span class="vl__order">
                  <button
                    type="button"
                    [disabled]="first"
                    [attr.aria-label]="'Subir ' + row.banner.name"
                    (click)="store.moveBanner(row.banner.id, -1)"
                  >
                    <mat-icon aria-hidden="true">keyboard_arrow_up</mat-icon>
                  </button>
                  <button
                    type="button"
                    [disabled]="last"
                    [attr.aria-label]="'Descer ' + row.banner.name"
                    (click)="store.moveBanner(row.banner.id, 1)"
                  >
                    <mat-icon aria-hidden="true">keyboard_arrow_down</mat-icon>
                  </button>
                </span>
              }
            </li>
          }
        </ol>
      } @else {
        <p class="vl__empty">Nenhum banner cadastrado — a home mostra o banner padrão.</p>
      }
    </section>
  `,
  styleUrl: './storefront-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBanners {
  protected readonly store = inject(AdminStorefront);
  protected readonly canEdit = inject(AuthService).can('settings:edit');
  protected readonly statusLabels = SHOW_STATUS_LABELS;

  protected readonly rows = computed(() => {
    const today = this.store.content.today();
    return this.store.content.allBanners().map((banner) => ({
      banner,
      status: showStatus(banner, today),
      link: linkToText(banner.link),
      period:
        banner.startsOn || banner.endsOn
          ? `${dayLabel(banner.startsOn) || 'Sem início'} a ${dayLabel(banner.endsOn) || 'sem fim'}`
          : 'Sem período (fica até desativar)',
    }));
  });
}
