import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { Announcement } from '../../../core/models/storefront';
import { AuthService } from '../../../core/services/auth-service';
import { linkToText, SHOW_STATUS_LABELS, showStatus } from '../../../core/utils/storefront-rules';
import { AdminStorefront } from '../services/admin-storefront';
import {
  AnnouncementDialog,
  AnnouncementDialogData,
  AnnouncementDialogResult,
} from './announcement-dialog';
import { StorefrontTabs } from './storefront-tabs';

const dayLabel = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '');

/**
 * `/admin/vitrine/avisos` — mensagens da faixa do topo. O frete grátis entra
 * sozinho em 1º (valor de Configurações da loja); os outros, nesta ordem.
 */
@Component({
  selector: 'app-admin-announcements',
  imports: [MatButtonModule, MatIconModule, RouterLink, StorefrontTabs],
  template: `
    <section class="vl">
      <app-storefront-tabs />
      <div class="vl__bar">
        <p>
          A faixa do topo da loja mostra os avisos <strong>No ar</strong>, nesta ordem, rolando.
        </p>
        @if (canEdit) {
          <button matButton="filled" class="ui-cta" type="button" (click)="edit()">
            <mat-icon>add</mat-icon> Novo aviso
          </button>
        }
      </div>
      <ol class="vl__list">
        <li class="vl__row vl__row--fixed">
          <span class="vl__icon"><mat-icon aria-hidden="true">local_shipping</mat-icon></span>
          <a class="vl__main" routerLink="/admin/configuracoes">
            <strong>Frete grátis acima de {{ store.content.freeShippingLabel() }}</strong>
            <span class="vl__status" [class]="'vl__status--' + freeShippingStatus()">
              {{ statusLabels[freeShippingStatus()] }}
            </span>
            <small>Automático — valor e liga/desliga em Configurações da loja</small>
          </a>
        </li>
        @for (row of rows(); track row.item.id; let first = $first, last = $last) {
          <li class="vl__row">
            <span class="vl__icon"><mat-icon aria-hidden="true">campaign</mat-icon></span>
            <button type="button" class="vl__main" [disabled]="!canEdit" (click)="edit(row.item)">
              <strong>{{ row.item.text }}</strong>
              <span class="vl__status" [class]="'vl__status--' + row.status">
                {{ statusLabels[row.status] }}
              </span>
              <small>{{ row.period }}</small>
              <small>{{ row.link || 'Sem link' }}</small>
            </button>
            @if (canEdit) {
              <span class="vl__order">
                <button
                  type="button"
                  [disabled]="first"
                  [attr.aria-label]="'Subir aviso ' + row.item.text"
                  (click)="store.moveAnnouncement(row.item.id, -1)"
                >
                  <mat-icon aria-hidden="true">keyboard_arrow_up</mat-icon>
                </button>
                <button
                  type="button"
                  [disabled]="last"
                  [attr.aria-label]="'Descer aviso ' + row.item.text"
                  (click)="store.moveAnnouncement(row.item.id, 1)"
                >
                  <mat-icon aria-hidden="true">keyboard_arrow_down</mat-icon>
                </button>
              </span>
            }
          </li>
        }
      </ol>
    </section>
  `,
  styleUrl: './storefront-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAnnouncements {
  protected readonly store = inject(AdminStorefront);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly canEdit = inject(AuthService).can('settings:edit');
  protected readonly statusLabels = SHOW_STATUS_LABELS;

  protected readonly freeShippingStatus = computed(() =>
    this.store.content.settings().freeShippingNotice ? 'no-ar' : 'inativo',
  );

  protected readonly rows = computed(() => {
    const today = this.store.content.today();
    return this.store.content.allAnnouncements().map((item) => ({
      item,
      status: showStatus(item, today),
      link: linkToText(item.link),
      period:
        item.startsOn || item.endsOn
          ? `${dayLabel(item.startsOn) || 'Sem início'} a ${dayLabel(item.endsOn) || 'sem fim'}`
          : 'Sem período (fica até desativar)',
    }));
  });

  protected edit(announcement?: Announcement): void {
    if (!this.canEdit) return;
    const data: AnnouncementDialogData = { announcement };
    this.dialog
      .open<AnnouncementDialog, AnnouncementDialogData, AnnouncementDialogResult>(
        AnnouncementDialog,
        { data, width: '480px', maxWidth: 'calc(100vw - 32px)', autoFocus: 'dialog' },
      )
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        if (result === 'excluir') {
          if (announcement) this.store.removeAnnouncement(announcement.id);
          this.snackBar.open('Aviso excluído.', 'Fechar', { duration: 3000 });
          return;
        }
        this.store.saveAnnouncement(announcement?.id ?? null, result);
        this.snackBar.open('Aviso salvo.', 'Fechar', { duration: 3000 });
      });
  }
}
