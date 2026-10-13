import { pageOf } from './paging';

const list = Array.from({ length: 45 }, (_, i) => i + 1);

describe('paginação', () => {
  it('recorta no formato do Spring', () => {
    const page = pageOf(list, 1, 20);
    expect(page.content[0]).toBe(21);
    expect(page.content.length).toBe(20);
    expect(page.totalPages).toBe(3);
    expect(page.totalElements).toBe(45);
  });

  it('página além do fim cai na última; lista vazia fica na 0', () => {
    expect(pageOf(list, 9, 20).number, 'além').toBe(2);
    expect(pageOf(list, 9, 20).content.length, 'última').toBe(5);
    expect(pageOf([], 3, 20).number, 'vazia').toBe(0);
    expect(pageOf(list, -1, 20).number, 'negativa').toBe(0);
  });
});
