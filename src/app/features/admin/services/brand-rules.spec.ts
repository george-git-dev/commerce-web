import { brandProblems } from './brand-rules';

describe('brand-rules', () => {
  it('nome obrigatório, curto e sem repetir', () => {
    expect(brandProblems('Lattafa Pride', ['Lattafa'])).toEqual([]);
    expect(brandProblems(' ', [])).toEqual(['Informe o nome da marca.']);
    expect(brandProblems('x'.repeat(41), [])[0]).toContain('40');
    expect(brandProblems('al-haramain', ['Al Haramain'])[0]).toContain('Já existe');
  });
});
