/**
 * Fotografias de ambientação (hero e faixa de categorias).
 *
 * São imagens sem marca visível, servidas pela CDN do Unsplash. Para usar a
 * produção fotográfica própria da loja, basta trocar as URLs abaixo por
 * arquivos locais em `public/img/`.
 */
export const IMAGERY = {
  hero: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=1920&q=80',
  heroSmall: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=900&q=70',
  categoriesBand: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=1600&q=70',
} as const;
