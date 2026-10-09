import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Announcement } from '../../../core/models/storefront';
import {
  ANNOUNCEMENT_MAX,
  announcementProblems,
  linkFromChoice,
  linkToText,
  presetOf,
} from '../../../core/utils/storefront-rules';
import { LinkPicker } from './link-picker';

export interface AnnouncementDialogData {
  announcement?: Announcement;
}

/** Resultado: dados para salvar, `'excluir'` ou `undefined` (desistiu). */
export type AnnouncementDialogResult = Omit<Announcement, 'id'> | 'excluir';

/** Criar/editar um aviso da faixa do topo (texto curto, link, ativo, período). */
@Component({
  selector: 'app-announcement-dialog',
  imports: [LinkPicker, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.announcement ? 'Editar aviso' : 'Novo aviso' }}</h2>
    <form (submit)="$event.preventDefault(); confirm()" novalidate>
      <mat-dialog-content>
        <fieldset>
          <label>
            Texto do aviso
            <input
              placeholder="Ex.: Cupom BEMVINDA: 10% na primeira compra"
              [attr.maxlength]="max"
              [value]="text()"
              [attr.aria-invalid]="
                (tried() && !!problems().length && text().trim().length < 3) || null
              "
              (input)="text.set($any($event.target).value)"
              cdkFocusInitial
            />
            <span class="vf__hint">
              <span>Só texto, curto — cabe na faixa do celular.</span>
              <span>{{ text().length }}/{{ max }}</span>
            </span>
          </label>
          <app-link-picker [tried]="tried()" [(preset)]="preset" [(text)]="linkText" />
          <label class="vf__check">
            <input
              type="checkbox"
              [checked]="active()"
              (change)="active.set($any($event.target).checked)"
            />
            Ativo (aparece na faixa)
          </label>
          <div class="vf__dates">
            <label>
              De (opcional)
              <input
                type="date"
                [value]="startsOn()"
                (input)="startsOn.set($any($event.target).value)"
              />
            </label>
            <label>
              Até (opcional)
              <input
                type="date"
                [min]="startsOn()"
                [value]="endsOn()"
                (input)="endsOn.set($any($event.target).value)"
              />
            </label>
          </div>
        </fieldset>
        @if (tried() && problems().length) {
          <ul class="vf__problems" role="alert">
            @for (problem of problems(); track problem) {
              <li>{{ problem }}</li>
            }
          </ul>
        }
      </mat-dialog-content>
      <mat-dialog-actions class="ad__actions">
        @if (data.announcement) {
          <button matButton type="button" class="vf__danger" (click)="ref.close('excluir')">
            Excluir
          </button>
        }
        <span class="ad__spacer"></span>
        <button matButton type="button" mat-dialog-close>Voltar</button>
        <button matButton="filled" type="submit">Salvar</button>
      </mat-dialog-actions>
    </form>
  `,
  styleUrls: ['./storefront-form.scss'],
  styles: `
    fieldset {
      padding-top: 4px;
    }

    .vf__problems {
      margin-top: 12px;
    }

    .ad__spacer {
      flex: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementDialog {
  protected readonly data = inject<AnnouncementDialogData>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<AnnouncementDialog, AnnouncementDialogResult>);
  protected readonly max = ANNOUNCEMENT_MAX;

  private readonly original = this.data.announcement;
  protected readonly text = signal(this.original?.text ?? '');
  protected readonly preset = signal(presetOf(this.original?.link));
  protected readonly linkText = signal(
    presetOf(this.original?.link) === 'custom' ? linkToText(this.original?.link) : '',
  );
  protected readonly active = signal(this.original?.active ?? true);
  protected readonly startsOn = signal(this.original?.startsOn ?? '');
  protected readonly endsOn = signal(this.original?.endsOn ?? '');
  protected readonly tried = signal(false);

  private readonly draft = computed<Omit<Announcement, 'id'>>(() => ({
    text: this.text().trim(),
    link: linkFromChoice(this.preset(), this.linkText()),
    active: this.active(),
    startsOn: this.startsOn() || undefined,
    endsOn: this.endsOn() || undefined,
  }));
  protected readonly problems = computed(() =>
    announcementProblems(this.draft(), { preset: this.preset(), text: this.linkText() }),
  );

  protected confirm(): void {
    this.tried.set(true);
    if (!this.problems().length) this.ref.close(this.draft());
  }
}
