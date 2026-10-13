import { Dialog } from '@angular/cdk/dialog';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { SwiperContainer } from 'swiper/element';
import { ImageLightbox, LightboxData } from '../image-lightbox/image-lightbox';

/**
 * Galeria da página de produto.
 * - Celular: carrossel com swipe e bolinhas.
 * - Desktop (≥900px): carrossel com miniaturas embaixo.
 * Tocar numa foto abre a tela de zoom (`ImageLightbox`).
 */
@Component({
  selector: 'app-product-gallery',
  templateUrl: './product-gallery.html',
  styleUrl: './product-gallery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProductGallery {
  readonly images = input.required<readonly string[]>();
  /** Nome do produto, usado no texto alternativo das fotos. */
  readonly alt = input.required<string>();

  private readonly dialog = inject(Dialog);
  private readonly swiperRef = viewChild<ElementRef<SwiperContainer>>('swiper');

  /** Índice da foto visível, para destacar a miniatura. */
  protected readonly active = signal(0);

  constructor() {
    afterNextRender(() => this.swiperRef()?.nativeElement.initialize?.());

    // Trocou de produto (ex.: clicou num relacionado): volta para a primeira foto.
    effect(() => {
      this.images();
      untracked(() => {
        this.active.set(0);
        this.swiperRef()?.nativeElement.swiper?.slideTo(0, 0);
      });
    });
  }

  protected onSlideChange(): void {
    const swiper = this.swiperRef()?.nativeElement.swiper;
    if (swiper) this.active.set(swiper.activeIndex);
  }

  protected goTo(index: number): void {
    this.swiperRef()?.nativeElement.swiper?.slideTo(index);
  }

  protected openZoom(index: number): void {
    this.dialog.open<void, LightboxData>(ImageLightbox, {
      data: { images: this.images(), alt: this.alt(), start: index },
      width: '100vw',
      height: '100dvh',
      maxWidth: '100vw',
      maxHeight: '100dvh',
      ariaLabel: `Fotos de ${this.alt()}`,
    });
  }
}