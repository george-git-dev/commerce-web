import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { IMAGE_RULES, imageProblem } from '../../services/product-rules';

/**
 * Imagens do produto: enviar, reordenar (a primeira é a principal) e remover.
 * Mock do upload: valida e mostra a prévia no navegador. Fase 2 (B3): envio
 * direto ao S3 por URL pré-assinada, com conversão para WEBP no back.
 */
@Component({
  selector: 'app-product-images',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './product-images.html',
  styleUrl: './product-images.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductImages {
  readonly images = model.required<readonly string[]>();
  readonly readOnly = input(false);

  protected readonly imageMax = IMAGE_RULES.max;
  protected readonly imageError = signal('');
  /** Endereços criados no navegador para a prévia: liberados ao sair da tela. */
  private readonly objectUrls: string[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.objectUrls.forEach((url) => URL.revokeObjectURL(url)));
  }

  protected addImages(input: HTMLInputElement): void {
    this.imageError.set('');
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const file of files) {
      if (this.images().length >= IMAGE_RULES.max) {
        this.imageError.set(`No máximo ${IMAGE_RULES.max} imagens.`);
        return;
      }
      const problem = imageProblem(file);
      if (problem) {
        this.imageError.set(`${file.name}: ${problem}`);
        continue;
      }
      const url = URL.createObjectURL(file);
      this.objectUrls.push(url);
      this.images.update((list) => [...list, url]);
    }
  }

  protected moveImage(index: number, step: -1 | 1): void {
    this.images.update((list) => {
      const next = [...list];
      [next[index], next[index + step]] = [next[index + step], next[index]];
      return next;
    });
  }

  protected removeImage(index: number): void {
    this.images.update((list) => list.filter((_, position) => position !== index));
  }
}
