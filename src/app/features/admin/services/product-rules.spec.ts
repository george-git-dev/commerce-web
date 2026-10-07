import { ProductVariant } from '../../../core/models/product';
import {
  imageProblem,
  similarName,
  requiredProblems,
  ProductDraft,
  slugify,
  uniqueSlug,
  variantProblems,
} from './product-rules';

const variant = (extra: Partial<ProductVariant> = {}): ProductVariant => ({
  id: 'asad-100',
  kind: 'frasco',
  volumeMl: 100,
  price: 299.9,
  stock: 10,
  ...extra,
});

describe('regras do cadastro de produto', () => {
  it('slug sem acentos e único', () => {
    expect(slugify('Lattafa Bade’e Al Oud — Glória')).toBe('lattafa-bade-e-al-oud-gloria');
    expect(uniqueSlug('lattafa-asad', ['lattafa-asad', 'lattafa-asad-2'])).toBe('lattafa-asad-3');
  });

  it('imagem: só JPG/PNG/WEBP até 5 MB', () => {
    expect(imageProblem({ type: 'image/webp', size: 1000 })).toBeNull();
    expect(imageProblem({ type: 'image/gif', size: 1000 })).toContain('JPG');
    expect(imageProblem({ type: 'image/png', size: 6 * 1024 * 1024 })).toContain('5 MB');
  });

  it('variantes: um frasco, SKU único, preço e promoção válidos', () => {
    expect(variantProblems([variant()], [])).toEqual([]);
    expect(variantProblems([], [])).toHaveLength(1);
    expect(variantProblems([variant(), variant({ id: 'asad-2' })], [])[0]).toContain('um frasco');
    expect(variantProblems([variant()], ['asad-100'])[0]).toContain('outro produto');
    expect(variantProblems([variant({ promoPrice: 299.9 })], [])[0]).toContain('promocional');
    expect(variantProblems([variant({ stock: -1 })], [])[0]).toContain('estoque');
  });

  it('não avança com campo obrigatório vazio', () => {
    const draft: ProductDraft = {
      brand: 'Lattafa',
      line: 'Asad',
      category: 'perfume',
      gender: 'Unissex',
      concentration: 'Eau de Parfum',
      description: 'Oriental especiado intenso.',
      kitItems: '',
      bottle: { enabled: true, volumeMl: 100, price: 299.9, stock: 0 },
      decants: [{ checked: true, price: 19.9 }],
      families: ['Oriental'],
      occasions: ['noite'],
      notes: 2,
      images: ['a.webp'],
    };
    for (const step of [0, 1, 2, 3, 4]) expect(requiredProblems(step, draft)).toEqual([]);

    expect(requiredProblems(0, { ...draft, line: '', description: 'curta' })).toHaveLength(2);
    expect(requiredProblems(0, { ...draft, category: 'kit' })[0]).toContain('itens do kit');
    const blank = { ...draft, category: '', gender: '', concentration: '' };
    expect(requiredProblems(0, blank)).toEqual(['Escolha a categoria.', 'Escolha o gênero.']);
    const perfume = { ...draft, gender: '', concentration: '' };
    expect(requiredProblems(0, perfume)).toHaveLength(2);
    expect(requiredProblems(0, { ...draft, concentration: 'none' })).toEqual([]);
    const noPrice = { ...draft.bottle, price: '', stock: '' };
    expect(requiredProblems(1, { ...draft, bottle: noPrice })).toHaveLength(2);
    const negative = { ...draft.bottle, volumeMl: -100, price: 0, stock: -1, promoPrice: -5 };
    expect(requiredProblems(1, { ...draft, bottle: negative })).toHaveLength(4);
    const promoHigh = { ...draft.bottle, promoPrice: 299.9 };
    expect(requiredProblems(1, { ...draft, bottle: promoHigh })[0]).toContain('promoção');
    const halfUnit = { ...draft.bottle, stock: 1.5 };
    expect(requiredProblems(1, { ...draft, bottle: halfUnit })).toHaveLength(1);
    const negativeDecant = [{ checked: true, price: -10 }];
    expect(requiredProblems(1, { ...draft, decants: negativeDecant })).toHaveLength(1);
    expect(
      requiredProblems(1, { ...draft, decants: [{ checked: true, price: null }] }),
    ).toHaveLength(1);
    // Família e ocasião viram filtro na loja: obrigatórias em qualquer categoria.
    expect(requiredProblems(2, { ...draft, families: [], occasions: [], notes: 0 })).toHaveLength(
      3,
    );
    const bodyMist = { ...draft, category: 'body-splash', notes: 0 };
    expect(requiredProblems(2, bodyMist)).toEqual([]);
    expect(requiredProblems(2, { ...bodyMist, families: [], occasions: [] })).toHaveLength(2);
    expect(requiredProblems(3, { ...draft, images: [] })).toHaveLength(1);
  });

  it('avisa nome igual ou parecido antes de criar marca/linha nova', () => {
    const brands = ['Lattafa', 'Al Haramain', 'Armaf'];
    expect(similarName('latafa', brands)).toBe('Lattafa');
    expect(similarName('AL-HARAMAIN', brands)).toBe('Al Haramain');
    expect(similarName('Rasasi', brands)).toBeUndefined();
    expect(similarName('', brands)).toBeUndefined();
  });
});
