/**
 * Mock da resposta de `GET /products/{slug}/related?limit=4`: para cada
 * perfume, os slugs sugeridos em "Você também pode gostar", na ordem.
 *
 * Escolhidos à mão seguindo a regra que o back vai implementar (ver roadmap,
 * B3): gênero compatível, só produtos com estoque, pontos por família em
 * comum, notas em comum (fundo vale mais) e mesma ocasião. O front não
 * calcula nada — só mostra o que o back devolver.
 */
export const RELATED_MOCK: Readonly<Record<string, readonly string[]>> = {
  'oud-real': ['couro-imperial', 'baunilha-e-sandalo', 'vetiver-noir', 'essencia-neutra'],
  'flor-de-ambar': ['jasmim-dourado', 'baunilha-e-sandalo', 'essencia-neutra'],
  'vetiver-noir': ['couro-imperial', 'oud-real', 'essencia-neutra', 'baunilha-e-sandalo'],
  'jasmim-dourado': ['flor-de-ambar', 'essencia-neutra', 'baunilha-e-sandalo'],
  'essencia-neutra': ['jasmim-dourado', 'vetiver-noir', 'flor-de-ambar', 'baunilha-e-sandalo'],
  'baunilha-e-sandalo': ['oud-real', 'couro-imperial', 'flor-de-ambar', 'essencia-neutra'],
  'couro-imperial': ['oud-real', 'vetiver-noir', 'baunilha-e-sandalo', 'essencia-neutra'],
  'petala-de-rosa': ['jasmim-dourado', 'flor-de-ambar', 'essencia-neutra'],
};
