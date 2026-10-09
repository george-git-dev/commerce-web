import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreBanner } from '../../../core/models/storefront';
import { AuthService } from '../../../core/services/auth-service';
import {
  BANNER_RULES,
  bannerProblems,
  linkFromChoice,
  linkToText,
  presetOf,
  SHOW_STATUS_LABELS,
  showStatus,
} from '../../../core/utils/storefront-rules';
import { AdminStorefront } from '../services/admin-storefront';
import { ActionDialog, ActionDialogData } from '../shared/action-dialog/action-dialog';
import { LinkPicker } from '../storefront/link-picker';
import { BannerImage } from './banner-image';

/** `/admin/vitrine/banners/novo` e `/:id` — arte, link, situação e período do banner. */
@Component({
  selector: 'app-admin-banner-form',
  imports: [BannerImage, LinkPicker, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './admin-banner-form.html',
  styleUrl: '../storefront/storefront-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBannerForm {
  private readonly store = inject(AdminStorefront);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly readOnly = !inject(AuthService).can('settings:edit');
  protected readonly rules = BANNER_RULES;
  protected readonly statusLabels = SHOW_STATUS_LABELS;

  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  protected readonly original = this.store.banner(this.id);

  protected readonly name = signal(this.original?.name ?? '');
  protected readonly image = signal<string | undefined>(this.original?.image);
  protected readonly imageDesktop = signal<string | undefined>(this.original?.imageDesktop);
  protected readonly alt = signal(this.original?.alt ?? '');
  protected readonly preset = signal(presetOf(this.original?.link));
  protected readonly linkText = signal(
    presetOf(this.original?.link) === 'custom' ? linkToText(this.original?.link) : '',
  );
  /** Banner novo começa desligado: só vai ao ar quando a equipe liga. */
  protected readonly active = signal(this.original?.active ?? false);
  protected readonly startsOn = signal(this.original?.startsOn ?? '');
  protected readonly endsOn = signal(this.original?.endsOn ?? '');
  protected readonly tried = signal(false);

  private readonly draft = computed<Omit<StoreBanner, 'id'>>(() => ({
    name: this.name().trim(),
    image: this.image() ?? '',
    imageDesktop: this.imageDesktop(),
    alt: this.alt().trim(),
    link: linkFromChoice(this.preset(), this.linkText()),
    active: this.active(),
    startsOn: this.startsOn() || undefined,
    endsOn: this.endsOn() || undefined,
  }));
  protected readonly problems = computed(() =>
    bannerProblems(this.draft(), { preset: this.preset(), text: this.linkText() }),
  );
  /** Situação com o que está na tela (antes de salvar). */
  protected readonly status = computed(() => showStatus(this.draft(), this.store.content.today()));

  protected save(): void {
    this.tried.set(true);
    if (this.problems().length) return;
    const id = this.store.saveBanner(this.id, this.draft());
    this.snackBar.open(
      this.status() === 'no-ar' ? 'Banner salvo — já está na home.' : 'Banner salvo.',
      'Fechar',
      { duration: 3000 },
    );
    if (!this.id) this.router.navigate(['/admin/vitrine/banners', id], { replaceUrl: true });
  }

  protected remove(): void {
    if (!this.id || !this.original) return;
    const data: ActionDialogData = {
      title: 'Excluir banner?',
      message: `"${this.original.name}" sai da lista e da home. Para só tirar do ar, desmarque "Ativo".`,
      confirmLabel: 'Excluir',
      danger: true,
    };
    this.dialog
      .open(ActionDialog, { data, width: '420px' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed || !this.id) return;
        this.store.removeBanner(this.id);
        this.snackBar.open('Banner excluído.', 'Fechar', { duration: 3000 });
        this.router.navigate(['/admin/vitrine']);
      });
  }
}
