import { Brand } from '../models/brand';

/**
 * Marcas da faixa rolante da home, na ordem de exibição.
 *
 * Para adicionar a logo: coloque o arquivo em `public/img/marcas/` (SVG de preferência,
 * ou PNG com fundo transparente) e preencha `logo`, ex.: 'img/marcas/lattafa.svg'.
 * Sem `logo`, a faixa mostra o nome da marca.
 *
 * Mostre apenas marcas que a loja realmente vende.
 */
export const BRANDS: readonly Brand[] = [
  { name: 'Lattafa', logo: 'img/marcas/lattafa.webp' },
  { name: 'Armaf', logo: 'img/marcas/armaf.webp' },
  { name: 'Afnan', logo: 'img/marcas/afnan.webp' },
  { name: 'Rasasi', logo: 'img/marcas/rasasi.webp' },
  { name: 'Maison Alhambra', logo: 'img/marcas/maison-alhambra.webp' },
  { name: 'Al Haramain', logo: 'img/marcas/al-haramain.webp' },
  { name: 'Paris Corner', logo: 'img/marcas/paris-corner.webp' },
  { name: 'Al Wataniah', logo: 'img/marcas/al-wataniah.webp' },
  { name: 'Ard Al Zaafaran', logo: 'img/marcas/ard-al-zaafaran.webp' },
  { name: 'Swiss Arabian', logo: 'img/marcas/swiss-arabian.webp' },
];