import { ProductCategory } from '../models/product';

/**
 * Categorias de produto da loja, na ordem em que aparecem nos filtros.
 * O `id` é o valor usado na URL (`/produtos?categoria=kit`) e no contrato.
 * Para acrescentar uma categoria: incluir no tipo `ProductCategory` e aqui.
 */
export const PRODUCT_CATEGORIES: readonly {
  id: ProductCategory;
  /** Singular, para etiquetas ("Kit", "Hidratante"). */
  label: string;
  /** Plural, para filtros e títulos ("Kits e presentes"). */
  plural: string;
}[] = [
  { id: 'perfume', label: 'Perfume', plural: 'Perfumes' },
  { id: 'kit', label: 'Kit', plural: 'Kits e presentes' },
  { id: 'hidratante', label: 'Hidratante', plural: 'Hidratantes' },
  { id: 'body-splash', label: 'Body splash', plural: 'Body splash' },
];

export const CATEGORY_LABELS = Object.fromEntries(
  PRODUCT_CATEGORIES.map((category) => [category.id, category]),
) as Record<ProductCategory, (typeof PRODUCT_CATEGORIES)[number]>;

export function isProductCategory(value: string | null): value is ProductCategory {
  return PRODUCT_CATEGORIES.some((category) => category.id === value);
}
