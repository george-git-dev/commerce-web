import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { bannerImageProblem } from '../../../core/utils/storefront-rules';

/**
 * Uma arte do banner com prévia na proporção certa (celular 4:5, desktop 8:3).
 * Mock do upload: valida tipo/tamanho e mostra a prévia do arquivo. Fase 2
 * (B3): envio ao S3 por URL pré-assinada; o back reprocessa e grava em WEBP.
 * O endereço de prévia não é liberado ao sair: no mock, a própria loja usa.
 */
@Component({
  selector: 'app-banner-image',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="bi__head">
      <span class="bi__label">{{ label() }}</span>
      <small>{{ hint() }}</small>
    </div>
    <div class="bi__frame" [class.bi__frame--wide]="wide()" [class.bi__frame--empty]="!image()">
      @if (image()) {
        <img [src]="image()" alt="" />
      } @else {
        <span><mat-icon aria-hidden="true">image</mat-icon> Sem imagem</span>
      }
    </div>
    @if (!readOnly()) {
      <div class="bi__actions">
        <label class="bi__upload">
          <mat-icon aria-hidden="true">upload</mat-icon>
          {{ image() ? 'Trocar imagem' : 'Enviar imagem' }}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            (change)="pick($any($event.target))"
          />
        </label>
        @if (image() && removable()) {
          <button matButton type="button" (click)="image.set(undefined)">Remover</button>
        }
      </div>
    }
    @if (error()) {
      <p class="bi__error" role="alert">{{ error() }}</p>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 8px;
      min-width: 0;
    }

    .bi__head {
      display: grid;
      gap: 2px;

      small {
        font-size: 0.75rem;
        color: var(--muted-foreground);
      }
    }

    .bi__label {
      font-size: 0.875rem;
      font-weight: 600;
    }

    // Prévia na proporção da loja: o que aparece aqui é o que o cliente vê.
    .bi__frame {
      display: grid;
      place-items: center;
      width: min(100%, 240px);
      aspect-ratio: 4 / 5;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--muted);

      &--wide {
        width: 100%;
        aspect-ratio: 8 / 3;
      }

      &--empty {
        border-style: dashed;
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8125rem;
        color: var(--muted-foreground);
      }
    }

    .bi__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    // Botão de envio: é um <label> com o campo de arquivo invisível por cima.
    .bi__upload {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 44px;
      padding: 0 16px;
      border: 1px solid var(--border);
      border-radius: 999px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;

      &:focus-within {
        outline: 2px solid var(--gold);
        outline-offset: 2px;
      }

      mat-icon {
        width: 18px;
        height: 18px;
        font-size: 18px;
      }

      input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }
    }

    .bi__error {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--wine);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerImage {
  readonly image = model<string | undefined>(undefined);
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly wide = input(false);
  readonly removable = input(false);
  readonly readOnly = input(false);

  protected readonly error = signal('');

  protected pick(field: HTMLInputElement): void {
    const file = field.files?.[0];
    field.value = '';
    if (!file) return;
    const problem = bannerImageProblem(file);
    this.error.set(problem ?? '');
    if (problem) return;
    this.image.set(URL.createObjectURL(file));
  }
}
