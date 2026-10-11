import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Announcement } from '../../../core/models/storefront';
import { AuthService } from '../../../core/services/auth-service';
import { moneyLabel, SHOW_STATUS_LABELS, showStatus } from '../../../core/utils/storefront-rules';
import { AdminStorefront } from '../services/admin-storefront';
import {
  AnnouncementDialog,
  AnnouncementDialogData,
  AnnouncementDialogResult,
} from './announcement-dialog';
import { FreeShippingDialog } from './free-shipping-dialog';
import { StorefrontTabs } from './storefront-tabs';

const dayLabel = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '');

/**
 * `/admin/vitrine/avisos` — mensagens da faixa do topo. O frete grátis entra
 * sozinho em 1º (promoção de Configurações; abre no mesmo diálogo); os outros
 * entram todos, só texto, valendo pelo período. Só promoções e recados — o que
 * é fixo da loja não entra aqui.
 */
@Component({
  selector: 'app-admin-announcements',
  imports: [MatButtonModule, MatIconModule, StorefrontTabs],
  template: `
    <section class="vl">
      <app-storefront-tabs />
      <div class="vl__bar">
        <p>
          A faixa do topo mostra, rolando, todos os avisos <strong>No ar</strong> — só texto. Com
          datas, aparece só no período; sem datas, fica até desativar.
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
          <button type="button" class="vl__main" (click)="editFreeShipping()">
            <strong>Frete grátis acima de {{ freeShipping().min }}</strong>
            <span class="vl__status" [class]="'vl__status--' + freeShipping().status">
              {{ statusLabels[freeShipping().status] }}
            </span>
            <small>Automático · {{ freeShipping().period }}</small>
          </button>
        </li>
        @for (row of rows(); track row.item.id) {
          <li class="vl__row">
            <span class="vl__icon"><mat-icon aria-hidden="true">campaign</mat-icon></span>
            <button type="button" class="vl__main" [disabled]="!canEdit" (click)="edit(row.item)">
              <strong>{{ row.item.text }}</strong>
              <span class="vl__status" [class]="'vl__status--' + row.status">
                {{ statusLabels[row.status] }}
              </span>
              <small>{{ row.period }}</small>
            </button>
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

  /** Linha do aviso automático: situação considera promoção e aviso ligados. */
  protected readonly freeShipping = computed(() => {
    const promo = this.store.content.settings().freeShipping;
    return {
      min: moneyLabel(promo.min),
      status: promo.notice ? showStatus(promo, this.store.content.today()) : ('inativo' as const),
      period: periodText(promo),
    };
  });

  protected readonly rows = computed(() => {
    const today = this.store.content.today();
    return this.store.content.allAnnouncements().map((item) => ({
      item,
      status: showStatus(item, today),
      period: periodText(item),
    }));
  });

  /** Mesmo padrão dos outros avisos: abre um diálogo (a regra é a das Configurações). */
  protected editFreeShipping(): void {
    this.dialog.open(FreeShippingDialog, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: 'dialog',
    });
  }

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

function periodText(item: { startsOn?: string; endsOn?: string }): string {
  return item.startsOn || item.endsOn
    ? `${dayLabel(item.startsOn) || 'Sem início'} a ${dayLabel(item.endsOn) || 'sem fim'}`
    : 'Sem período (fica até desativar)';
}
