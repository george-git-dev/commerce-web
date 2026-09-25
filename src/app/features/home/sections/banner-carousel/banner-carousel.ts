import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { SwiperContainer } from 'swiper/element';
import { BANNERS } from '../../../../core/config/banners';

@Component({
  selector: 'app-banner-carousel',
  imports: [MatIconModule],
  templateUrl: './banner-carousel.html',
  styleUrl: './banner-carousel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Permite usar <swiper-container>/<swiper-slide>, que são web components (não Angular).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BannerCarousel {
  private readonly swiperRef = viewChild<ElementRef<SwiperContainer>>('swiper');

  protected readonly banners = BANNERS;
  protected readonly playing = signal(true);

  constructor() {
    // Roda só no navegador, depois que os slides estão na tela.
    afterNextRender(() => {
      this.swiperRef()?.nativeElement.initialize?.();

      // Quem pediu "reduzir movimento" no sistema não recebe autoplay.
      if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        this.setAutoplay(false);
      }
    });
  }

  protected toggleAutoplay(): void {
    this.setAutoplay(!this.playing());
  }

  private setAutoplay(on: boolean): void {
    const autoplay = this.swiperRef()?.nativeElement.swiper?.autoplay;
    if (!autoplay) return;
    if (on) {
      autoplay.start();
    } else {
      autoplay.stop();
    }
    this.playing.set(on);
  }
}
