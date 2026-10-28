import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { STORE_CONFIG } from '../config/store-config';
import { Seo } from './seo';

const MARQUEE = `${STORE_CONFIG.name} ● ${STORE_CONFIG.tagline} | `;
const STEP_MS = 200;

/**
 * Título da aba "rolando" só quando o cliente sai para outra aba (chama a
 * atenção para voltar). Com a aba visível, fica o título da página — o que o
 * Google indexa e o leitor de tela anuncia.
 */
@Injectable({ providedIn: 'root' })
export class AwayTitle {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly seo = inject(Seo);
  private timer: ReturnType<typeof setInterval> | null = null;
  private position = 0;

  /** Começa a observar a visibilidade da aba; devolve a função que para. */
  start(): () => void {
    const onChange = () => (this.document.hidden ? this.roll() : this.stop());
    this.document.addEventListener('visibilitychange', onChange);
    return () => {
      this.document.removeEventListener('visibilitychange', onChange);
      this.stop();
    };
  }

  private roll(): void {
    if (this.timer) return;
    this.position = 0;
    this.timer = setInterval(() => {
      this.title.setTitle(MARQUEE.slice(this.position) + MARQUEE.slice(0, this.position));
      this.position = (this.position + 1) % MARQUEE.length;
    }, STEP_MS);
  }

  /** Volta o título da página (o mais recente, mesmo que tenha mudado com a aba escondida). */
  private stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    this.title.setTitle(this.seo.pageTitle());
  }
}
