import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { SwiperContainer } from 'swiper/element';

/** O que a galeria passa para a tela de zoom ao abrir. */
export interface LightboxData {
  images: readonly string[];
  alt: string;
  /** Índice da foto que o usuário tocou. */
  start: number;
}

/**
 * Fotos do produto em tela cheia, com zoom (pinça ou toque duplo no celular,
 * duplo clique no desktop). Aberta pelo `Dialog` do CDK, que cuida do Esc,
 * do foco e de travar a rolagem da página por trás.
 */
@Component({
  selector: 'app-image-lightbox',
  imports: [MatIconModule],
  templateUrl: './image-lightbox.html',
  styleUrl: './image-lightbox.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ImageLightbox {
  protected readonly data = inject<LightboxData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef);
  private readonly swiperRef = viewChild<ElementRef<SwiperContainer>>('swiper');

  /** Posição exibida no contador ("2 / 4"), começando em 1. */
  protected readonly current = signal(this.data.start + 1);

  constructor() {
    afterNextRender(() => this.swiperRef()?.nativeElement.initialize?.());
  }

  protected onSlideChange(): void {
    const swiper = this.swiperRef()?.nativeElement.swiper;
    if (swiper) this.current.set(swiper.activeIndex + 1);
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
