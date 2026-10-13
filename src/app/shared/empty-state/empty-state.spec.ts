import { $, render, textOf } from '../../../testing/test-helpers';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('mostra título, mensagem e o botão com link', async () => {
    const fixture = await render(EmptyState, {
      inputs: {
        icon: 'shopping_bag',
        title: 'Sua sacola está vazia',
        message: 'Que tal começar pelos lançamentos?',
        ctaLabel: 'Ver perfumes',
        ctaLink: '/produtos',
      },
    });
    expect(textOf(fixture)).toContain('Sua sacola está vazia');
    expect(textOf(fixture)).toContain('Que tal começar pelos lançamentos?');
    expect($(fixture, 'a').getAttribute('href')).toBe('/produtos');
  });

  it('sem link, o botão emite o clique para a página tratar', async () => {
    const fixture = await render(EmptyState, {
      inputs: { icon: 'search', title: 'Nada encontrado', ctaLabel: 'Limpar filtros' },
    });
    let clicks = 0;
    fixture.componentInstance.ctaClick.subscribe(() => clicks++);
    $(fixture, 'button').click();
    expect(clicks).toBe(1);
  });

  it('sem CTA, não mostra botão', async () => {
    const fixture = await render(EmptyState, { inputs: { icon: 'x', title: 'Vazio' } });
    expect((fixture.nativeElement as HTMLElement).querySelector('button, a')).toBeNull();
  });
});
