import { categoriesTitle, formatCategories, parseCategories } from './product-categories';

describe('product-categories', () => {
  it('lê uma ou várias categorias da URL, ignorando valores desconhecidos', () => {
    expect(parseCategories(null)).toEqual([]);
    expect(parseCategories('kit')).toEqual(['kit']);
    expect(parseCategories('body-splash,hidratante,xpto,kit')).toEqual([
      'kit',
      'hidratante',
      'body-splash',
    ]);
  });

  it('monta o valor da URL na ordem padrão, ou null quando vazio', () => {
    expect(formatCategories([])).toBeNull();
    expect(formatCategories(['body-splash', 'hidratante'])).toBe('hidratante,body-splash');
  });

  it('dá nome ao título conforme a seleção', () => {
    expect(categoriesTitle([])).toBe('Todos os produtos');
    expect(categoriesTitle(['kit'])).toBe('Kits e presentes');
    expect(categoriesTitle(['hidratante', 'body-splash'])).toBe('Corpo e banho');
    expect(categoriesTitle(['perfume', 'kit'])).toBe('Perfumes · Kits e presentes');
  });
});
