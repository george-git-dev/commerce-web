import { Category } from '../models/category';
import { NavLink } from '../models/nav-link';
import { BODY_CARE_CATEGORIES, CATEGORY_SEPARATOR } from './product-categories';

/** Nomes de query params aceitos por `/produtos` — único ponto de verdade do contrato de filtro. */
export const CATALOG_QUERY_PARAMS = {
  gender: 'genero',
  brand: 'marca',
  priceMin: 'precoMin',
  priceMax: 'precoMax',
  search: 'busca',
  deal: 'oferta',
  launch: 'lancamento',
  category: 'categoria',
  family: 'familia',
  occasion: 'ocasiao',
  minRating: 'nota',
  inStock: 'estoque',
  kind: 'tipo',
  sort: 'ordenar',
} as const;

/** Âncora institucional da home (imagem + texto + CTA "conheça nossa história"). */
export const HOME_SECTION_IDS = {
  story: 'historia',
} as const;

export const NAV_LINKS: readonly NavLink[] = [
  // "Início" saiu do menu (30/09): o logo já leva para a home.
  { label: 'Ver tudo', path: '/produtos' },
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
  {
    label: 'Kits',
    path: '/produtos',
    queryParams: { [CATALOG_QUERY_PARAMS.category]: 'kit' },
  },
  {
    label: 'Corpo e banho',
    path: '/produtos',
    queryParams: {
      [CATALOG_QUERY_PARAMS.category]: BODY_CARE_CATEGORIES.join(CATEGORY_SEPARATOR),
    },
  },
  {
    label: 'Lançamentos',
    path: '/produtos',
    queryParams: { [CATALOG_QUERY_PARAMS.launch]: 'true' },
  },
  { label: 'Ofertas', path: '/produtos', queryParams: { [CATALOG_QUERY_PARAMS.deal]: 'true' } },
];

/** Query params de `/produtos` para o tile de uma categoria da home. */
export function categoryQueryParams(category: Category): Record<string, string> {
  if (category.categoryFilter?.length) {
    return { [CATALOG_QUERY_PARAMS.category]: category.categoryFilter.join(CATEGORY_SEPARATOR) };
  }
  if (category.genderFilter) {
    return { [CATALOG_QUERY_PARAMS.gender]: category.genderFilter };
  }
  if (category.id === 'ofertas') {
    return { [CATALOG_QUERY_PARAMS.deal]: 'true' };
  }
  if (category.id === 'ver-tudo') {
    return {};
  }
  if (category.id === 'lancamentos') {
    return { [CATALOG_QUERY_PARAMS.launch]: 'true' };
  }
  // Tiles sem filtro estruturado caem de volta na busca textual.
  return { [CATALOG_QUERY_PARAMS.search]: category.name };
}
