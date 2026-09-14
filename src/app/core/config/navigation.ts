import { NavLink } from '../models/nav-link';

/**
 * Âncoras das seções da home. Usadas tanto pelo menu quanto pelos `id` do DOM,
 * para que um link nunca aponte para um destino que não existe.
 */
export const SECTION_IDS = {
  categories: 'categorias',
  products: 'produtos',
  contact: 'contato',
} as const;

/** Âncora de um card de categoria dentro da seção de categorias. */
export function categoryAnchorId(categoryId: string): string {
  return `categoria-${categoryId}`;
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: 'Destaques', fragment: SECTION_IDS.products },
  { label: 'Masculinos', fragment: categoryAnchorId('masculinos') },
  { label: 'Femininos', fragment: categoryAnchorId('femininos') },
  { label: 'Árabes', fragment: categoryAnchorId('arabes') },
  { label: 'Kits', fragment: categoryAnchorId('kits') },
  { label: 'Lançamentos', fragment: categoryAnchorId('lancamentos') },
  { label: 'Ofertas', fragment: categoryAnchorId('ofertas') },
  { label: 'Contato', fragment: SECTION_IDS.contact },
];
