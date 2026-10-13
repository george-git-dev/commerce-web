import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const AUDIO_SRC = 'audio/ambiente.mp3';
const STORAGE_KEY = 'nani.ambient-sound';
const TARGET_VOLUME = 0.25;
const FADE_MS = 1200;
const FADE_STEP_MS = 50;

/**
 * Som ambiente do site. Ligado por padrão; o cliente desliga pelo botão do header.
 * - Toca a partir do primeiro toque/clique/tecla na página (os navegadores bloqueiam
 *   som automático antes de uma interação). O arquivo só é baixado nesse momento.
 * - Lembra se o cliente desligou e respeita isso nas próximas visitas.
 * - Pausa quando a aba fica oculta e retoma ao voltar.
 */
@Injectable({ providedIn: 'root' })
export class AmbientSoundService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private audio?: HTMLAudioElement;
  private fadeTimer?: ReturnType<typeof setInterval>;

  private readonly enabledState = signal(false);
  readonly enabled = this.enabledState.asReadonly();

  constructor() {
    if (!this.isBrowser) return;

    this.document.addEventListener('visibilitychange', () => this.onVisibilityChange());

    // Ligado por padrão, a menos que o cliente já tenha desligado numa visita anterior.
    if (this.readPreference() === 'off') return;
    this.enabledState.set(true);

    // Navegadores só liberam som após uma interação: toca no primeiro toque/clique/tecla.
    const unlock = new AbortController();
    const start = (event: Event): void => {
      // Se o primeiro toque for no próprio botão de som, quem decide é o botão (desligar).
      if ((event.target as Element | null)?.closest('[data-ambient-toggle]')) return;
      if (this.enabled()) this.play();
      unlock.abort();
    };
    this.document.addEventListener('pointerdown', start, { signal: unlock.signal });
    this.document.addEventListener('keydown', start, { signal: unlock.signal });
  }

  toggle(): void {
    if (this.enabled()) {
      this.enabledState.set(false);
      this.savePreference(false);
      this.fadeTo(0, () => this.audio?.pause());
    } else {
      this.enabledState.set(true);
      this.savePreference(true);
      this.play();
    }
  }

  private play(): void {
    const audio = this.getAudio();
    if (!audio.paused) return;
    audio.volume = 0;
    audio
      .play()
      .then(() => this.fadeTo(TARGET_VOLUME))
      .catch(() => {
        // Navegador bloqueou (ainda sem interação): tenta de novo no próximo toque.
      });
  }

  private onVisibilityChange(): void {
    if (!this.audio) return;
    if (this.document.hidden) {
      this.audio.pause();
    } else if (this.enabled()) {
      this.play();
    }
  }

  /** Cria o elemento de áudio só na primeira vez que é preciso. */
  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio(AUDIO_SRC);
      this.audio.loop = true;
    }
    return this.audio;
  }

  /** Muda o volume aos poucos, para o som entrar e sair suave. */
  private fadeTo(target: number, done?: () => void): void {
    const audio = this.audio;
    if (!audio) return;
    clearInterval(this.fadeTimer);
    const step = (target - audio.volume) / (FADE_MS / FADE_STEP_MS);
    this.fadeTimer = setInterval(() => {
      const next = audio.volume + step;
      const reached = step >= 0 ? next >= target : next <= target;
      audio.volume = reached ? target : next;
      if (reached) {
        clearInterval(this.fadeTimer);
        done?.();
      }
    }, FADE_STEP_MS);
  }

  private readPreference(): 'on' | 'off' | null {
    try {
      const value = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      return value === 'on' || value === 'off' ? value : null;
    } catch {
      return null;
    }
  }

  private savePreference(on: boolean): void {
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch {
      // Modo anônimo ou armazenamento bloqueado: só não lembra a escolha.
    }
  }
}
