import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AwayTitle } from './away-title';
import { Seo } from './seo';

/** Simula o cliente trocando de aba (o jsdom não muda `document.hidden` sozinho). */
const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('AwayTitle (título rolando só com a aba em segundo plano)', () => {
  let stop: () => void;
  let seo: Seo;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    seo = TestBed.inject(Seo);
    seo.update({ title: 'Asad — Lattafa | Nani Perfumes' }, '/produtos/lattafa-asad');
    stop = TestBed.inject(AwayTitle).start();
  });

  afterEach(() => {
    stop();
    setHidden(false);
    vi.useRealTimers();
  });

  it('com a aba visível o título da página fica parado', () => {
    vi.advanceTimersByTime(2000);
    expect(document.title).toBe('Asad — Lattafa | Nani Perfumes');
  });

  it('em segundo plano rola; ao voltar mostra o título da página', () => {
    setHidden(true);
    vi.advanceTimersByTime(200);
    const first = document.title;
    expect(first.startsWith('Nani Perfumes')).toBe(true);
    vi.advanceTimersByTime(200);
    expect(document.title).not.toBe(first);

    setHidden(false);
    expect(document.title).toBe('Asad — Lattafa | Nani Perfumes');
    vi.advanceTimersByTime(1000);
    expect(document.title).toBe('Asad — Lattafa | Nani Perfumes');
  });

  it('página que mudou com a aba escondida: volta o título novo', () => {
    setHidden(true);
    seo.update({ title: 'Carrinho | Nani Perfumes', noindex: true }, '/carrinho');
    vi.advanceTimersByTime(400);
    setHidden(false);
    expect(document.title).toBe('Carrinho | Nani Perfumes');
  });

  it('parar remove o efeito', () => {
    stop();
    setHidden(true);
    vi.advanceTimersByTime(1000);
    expect(document.title).toBe('Asad — Lattafa | Nani Perfumes');
  });
});
