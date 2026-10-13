/**
 * Fotografias de ambientação, servidas localmente em `public/img/`.
 *
 * `productPlaceholder` substitui a foto por produto: a API ainda não retorna
 * imagem por produto (ver doc do `Product`), então todo card usa a mesma foto
 * genérica de coleção.
 */
export const IMAGERY = {
  categoriesBand: 'img/perfume-categories.jpg',
  productPlaceholder: 'img/perfume-collection.jpg',
  story: 'img/perfume-story.jpg',
} as const;
