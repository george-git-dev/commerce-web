import { OLFACTORY_FAMILIES } from '../config/fragrance';
import { PRODUCT_CATEGORIES } from '../config/product-categories';
import { Occasion, Product, ProductCategory, VariantKind } from '../models/product';
import { effectivePrice, hasDeal, hasKind, isAvailable, lowestPrice } from './product-pricing';

export type CatalogSort =
  'relevancia' | 'mais-vendidos' | 'menor-preco' | 'maior-preco' | 'avaliacao';

/** Filtros, ordem e página do catálogo (`/produtos`). Listas valem como "ou". */
export interface CatalogQuery {
  categories: readonly ProductCategory[];
  families: readonly string[];
  occasions: readonly Occasion[];
  /** Só no modo simulado (avaliações ainda não existem no back). */
  minRating: number | null;
  inStock: boolean;
  gender: string | null;
  brand: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  search: string;
  deal: boolean;
  launch: boolean;
  bestSeller: boolean;
  badges: readonly string[];
  kind: VariantKind | null;
  sort: CatalogSort;
  /** Começa em 0. */
  page: number;
  size: number;
}

export const EMPTY_CATALOG_QUERY: CatalogQuery = {
  categories: [],
  families: [],
  occasions: [],
  minRating: null,
  inStock: false,
  gender: null,
  brand: null,
  minPrice: null,
  maxPrice: null,
  search: '',
  deal: false,
  launch: false,
  bestSeller: false,
  badges: [],
  kind: null,
  sort: 'relevancia',
  page: 0,
  size: 24,
};

export interface CatalogPage {
  items: readonly Product[];
  page: number;
  size: number;
  /** Quantos produtos passam nos filtros (todas as páginas). */
  totalItems: number;
  totalPages: number;
}

/** Opções de filtro que existem nos produtos da loja. */
export interface CatalogFilterOptions {
  categories: readonly string[];
  brands: readonly string[];
  families: readonly string[];
  occasions: readonly string[];
  genders: readonly string[];
  badges: readonly string[];
  minPrice: number | null;
  maxPrice: number | null;
}

/**
 * Busca do modo SIMULADO (testes e `start:mock`), com as mesmas regras do back
 * (`GET /catalog/products`). No modo `bff`, quem filtra, ordena e pagina é o back.
 */
export function searchProducts(products: readonly Product[], query: CatalogQuery): CatalogPage {
  const search = normalize(query.search);
  const anyHighlight = query.deal || query.launch || query.bestSeller || query.badges.length > 0;

  const list = products.filter((product) => {
    if (query.categories.length && !query.categories.includes(product.category)) return false;
    if (
      query.families.length &&
      !query.families.some((f) => product.families.includes(f as never))
    ) {
      return false;
    }
    // Produto sem ocasião cadastrada não entra quando o filtro está ativo.
    if (query.occasions.length && !query.occasions.some((o) => product.occasions?.includes(o))) {
      return false;
    }
    if (query.minRating !== null && (product.rating ?? 0) < query.minRating) return false;
    if (query.inStock && !isAvailable(product)) return false;
    if (query.gender && product.gender !== query.gender) return false;
    if (query.brand && product.brandName !== query.brand) return false;
    // Preço: o produto entra se algum tamanho estiver dentro da faixa.
    if (
      (query.minPrice !== null || query.maxPrice !== null) &&
      !product.variants.some((variant) => {
        const price = effectivePrice(variant);
        return (
          (query.minPrice === null || price >= query.minPrice) &&
          (query.maxPrice === null || price <= query.maxPrice)
        );
      })
    ) {
      return false;
    }
    // Destaques: dentro do grupo vale "ou" — Lançamentos + Ofertas mostra os dois.
    if (
      anyHighlight &&
      !(
        (query.deal && hasDeal(product)) ||
        (query.launch && product.launch) ||
        (query.bestSeller && product.bestSeller) ||
        (!!product.badge && query.badges.includes(product.badge))
      )
    ) {
      return false;
    }
    if (query.kind && !hasKind(product, query.kind)) return false;
    if (
      search &&
      !normalize(`${product.name} ${product.brandName} ${product.families.join(' ')}`).includes(
        search,
      )
    ) {
      return false;
    }
    return true;
  });

  const sorted = [...list];
  switch (query.sort) {
    case 'mais-vendidos':
      sorted.sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0));
      break;
    case 'menor-preco':
      sorted.sort((a, b) => lowestPrice(a) - lowestPrice(b));
      break;
    case 'maior-preco':
      sorted.sort((a, b) => lowestPrice(b) - lowestPrice(a));
      break;
    case 'relevancia':
      // Igual ao back: o que dá para comprar agora primeiro, depois os mais novos.
      sorted.sort((a, b) => Number(isAvailable(b)) - Number(isAvailable(a)) || b.id - a.id);
      break;
    case 'avaliacao':
      // Empate na média: quem tem mais avaliações vem antes.
      sorted.sort(
        (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
      );
      break;
  }
  const start = query.page * query.size;
  return {
    items: sorted.slice(start, start + query.size),
    page: query.page,
    size: query.size,
    totalItems: sorted.length,
    totalPages: Math.ceil(sorted.length / query.size),
  };
}

/** Opções de filtro do modo SIMULADO (no `bff`, vêm de `GET /catalog/filters`). */
export function filterOptionsOf(products: readonly Product[]): CatalogFilterOptions {
  const prices = products.flatMap((product) => product.variants.map(effectivePrice));
  const present = new Set(products.flatMap((product) => product.families as readonly string[]));
  const categories = new Set(products.map((product) => product.category));
  const occasions = new Set(products.flatMap((product) => product.occasions ?? []));
  const genders = new Set(products.map((product) => product.gender));
  return {
    categories: PRODUCT_CATEGORIES.map((c) => c.id).filter((id) => categories.has(id)),
    brands: [...new Set(products.map((product) => product.brandName))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    ),
    families: OLFACTORY_FAMILIES.filter((family) => present.has(family)),
    occasions: (['dia', 'noite'] as const).filter((occasion) => occasions.has(occasion)),
    genders: (['Masculino', 'Feminino', 'Unissex'] as const).filter((g) => genders.has(g)),
    badges: [
      ...new Set(
        products.map((product) => product.badge).filter((badge): badge is string => !!badge),
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
  };
}

/** Minúsculas e sem acento: "Cítrico" acha com "citrico" (igual ao back). */
function normalize(text: string): string {
  return text.trim().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
