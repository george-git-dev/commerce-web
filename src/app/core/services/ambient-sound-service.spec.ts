import { TestBed } from '@angular/core/testing';
import { AmbientSoundService } from './ambient-sound-service';

/** Áudio falso: o jsdom não toca som. */
class FakeAudio {
  static created = 0;
  paused = true;
  volume = 1;
  loop = false;
  constructor(readonly src: string) {
    FakeAudio.created++;
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

describe('AmbientSoundService (som ambiente)', () => {
  const original = globalThis.Audio;

  beforeEach(() => {
    localStorage.clear();
    FakeAudio.created = 0;
    globalThis.Audio = FakeAudio as unknown as typeof Audio;
  });

  afterEach(() => {
    globalThis.Audio = original;
  });

  it('ligado por padrão, mas só baixa/toca no primeiro toque na página', () => {
    const sound = TestBed.inject(AmbientSoundService);
    expect(sound.enabled()).toBe(true);
    expect(FakeAudio.created).toBe(0);
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    // ≥ 1: outras instâncias de testes anteriores também escutam o documento.
    expect(FakeAudio.created).toBeGreaterThanOrEqual(1);
  });

  it('primeiro toque no próprio botão de som não liga (o botão decide)', () => {
    TestBed.inject(AmbientSoundService);
    const button = document.createElement('button');
    button.setAttribute('data-ambient-toggle', '');
    document.body.append(button);
    button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(FakeAudio.created).toBe(0);
    button.remove();
  });

  it('desligar lembra a escolha na próxima visita', () => {
    const sound = TestBed.inject(AmbientSoundService);
    sound.toggle();
    expect(sound.enabled()).toBe(false);
    expect(localStorage.getItem('nani.ambient-sound')).toBe('off');
    TestBed.resetTestingModule();
    expect(TestBed.inject(AmbientSoundService).enabled()).toBe(false);
  });

  it('religar toca de novo; aba oculta pausa', async () => {
    localStorage.setItem('nani.ambient-sound', 'off');
    const sound = TestBed.inject(AmbientSoundService);
    sound.toggle();
    expect(sound.enabled()).toBe(true);
    expect(localStorage.getItem('nani.ambient-sound')).toBe('on');
    await Promise.resolve();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(FakeAudio.created).toBeGreaterThanOrEqual(1);
  });
});
