import { signal } from '@angular/core';
import { Paging } from './paging';

describe('Paging (estado da lista)', () => {
  const list = Array.from({ length: 95 }, (_, i) => i);

  it('mudar filtro volta para a 1ª página; voltar ao filtro não restaura', () => {
    const filter = signal('todos');
    const paging = new Paging(() => filter());
    paging.setPage(3);
    expect(paging.of(list).content[0], 'página 4').toBe(60);
    filter.set('bloqueados');
    expect(paging.page(), 'filtro novo').toBe(0);
    filter.set('todos');
    expect(paging.page(), 'filtro antigo').toBe(0);
  });

  it('trocar o tamanho volta para a 1ª página', () => {
    const paging = new Paging();
    paging.setPage(2);
    paging.setSize(50);
    expect(paging.page()).toBe(0);
    expect(paging.of(list).totalPages).toBe(2);
  });
});
