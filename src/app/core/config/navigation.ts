import { Category } from '../models/category';
import { NavLink } from '../models/nav-link';

/** Nomes de query params aceitos por `/produtos` — único ponto de verdade do contrato de filtro. */
export const CATALOG_QUERY_PARAMS = {
  gender: 'genero',
  brand: 'marca',
  priceMin: 'precoMin',
  priceMax: 'precoMax',
  search: 'busca',
  deal: 'oferta',
  launch: 'lancamento',
  sort: 'ordenar',
} as const;

/** Âncora institucional da home (imagem + texto + CTA "conheça nossa história"). */
export const HOME_SECTION_IDS = {
  story: 'historia',
} as const;

export const NAV_LINKS: readonly NavLink[] = [
  { label: 'Início', path: '/' },
  { label: 'Perfumes', path: '/produtos' },
  {
    label: 'Masculinos',
    path: '/produtos',
    queryParams: { [CATALOG_QUERY_PARAMS.gender]: 'Masculino' },
  },
  {
    label: 'Femininos',
    path: '/produtos',
    queryParams: { [CATALOG_QUERY_PARAMS.gender]: 'Feminino' },
  },
  {
    label: 'Unissex',
    path: '/produtos',
    queryParams: { [CATALOG_QUERY_PARAMS.gender]: 'Unissex' },
  },
  { label: 'Ofertas', path: '/produtos', queryParams: { [CATALOG_QUERY_PARAMS.deal]: 'true' } },
  {
    label: 'Lançamentos',
    path: '/produtos',
    queryParams: { [CATALOG_QUERY_PARAMS.launch]: 'true' },
  },
];

/** Query params de `/produtos` para o tile de uma categoria da home. */
export function categoryQueryParams(category: Category): Record<string, string> {
  if (category.genderFilter) {
    return { [CATALOG_QUERY_PARAMS.gender]: category.genderFilter };
  }
  if (category.id === 'ofertas') {
    return { [CATALOG_QUERY_PARAMS.deal]: 'true' };
  }
  if (category.id === 'lancamentos') {
    return { [CATALOG_QUERY_PARAMS.launch]: 'true' };
  }
  // Kits e demais categorias sem filtro estruturado caem de volta na busca textual.
  return { [CATALOG_QUERY_PARAMS.search]: category.name };
}
