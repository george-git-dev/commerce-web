import { ProductCategory } from '../models/product';

/**
 * Categorias de produto da loja, na ordem em que aparecem nos filtros.
 * O `id` é o valor usado na URL (`/produtos?categoria=kit`) e no contrato.
 * Categorias criadas no backoffice ficam no `AdminProductStore` até o B3.
 */
export interface CategoryInfo {
  id: ProductCategory;
  /** Singular, para etiquetas ("Kit", "Hidratante"). */
  label: string;
  /** Plural, para filtros e títulos ("Kits e presentes"). */
  plural: string;
}

export const PRODUCT_CATEGORIES: readonly CategoryInfo[] = [
  { id: 'perfume', label: 'Perfume', plural: 'Perfumes' },
  { id: 'kit', label: 'Kit', plural: 'Kits e presentes' },
  { id: 'hidratante', label: 'Hidratante', plural: 'Hidratantes' },
  { id: 'body-splash', label: 'Body splash', plural: 'Body splash' },
];

/** Rótulos de uma categoria; id desconhecido (ex.: criada no backoffice) usa o próprio id. */
export function categoryInfo(id: ProductCategory): CategoryInfo {
  return PRODUCT_CATEGORIES.find((category) => category.id === id) ?? { id, label: id, plural: id };
}

export function isProductCategory(value: string | null): value is ProductCategory {
  return PRODUCT_CATEGORIES.some((category) => category.id === value);
}

/** Separador de várias categorias na URL: `?categoria=hidratante,body-splash`. */
export const CATEGORY_SEPARATOR = ',';

/**
 * Agrupamentos com nome próprio, usados no menu e no título do catálogo.
 * Ex.: "Corpo e banho" = hidratantes + body splash.
 */
export const BODY_CARE_CATEGORIES: readonly ProductCategory[] = ['hidratante', 'body-splash'];

export const CATEGORY_GROUPS: readonly { label: string; categories: readonly ProductCategory[] }[] =
  [{ label: 'Corpo e banho', categories: BODY_CARE_CATEGORIES }];

/**
 * Lê `?categoria=` (uma ou várias, separadas por vírgula). Ignora valores
 * desconhecidos e devolve na ordem de `PRODUCT_CATEGORIES`, sem repetição.
 */
export function parseCategories(value: string | null): ProductCategory[] {
  const ids = new Set((value ?? '').split(CATEGORY_SEPARATOR).map((id) => id.trim()));
  return PRODUCT_CATEGORIES.filter((category) => ids.has(category.id)).map(
    (category) => category.id,
  );
}

/** Monta o valor de `?categoria=`; `null` quando nenhuma está marcada (= todas). */
export function formatCategories(categories: readonly ProductCategory[]): string | null {
  return parseCategories(categories.join(CATEGORY_SEPARATOR)).join(CATEGORY_SEPARATOR) || null;
}

/** Título para uma seleção: nome do grupo, plural da categoria ou os plurais juntos. */
export function categoriesTitle(categories: readonly ProductCategory[]): string {
  if (categories.length === 0) return 'Todos os produtos';
  const group = CATEGORY_GROUPS.find(
    (item) =>
      item.categories.length === categories.length &&
      item.categories.every((id) => categories.includes(id)),
  );
  if (group) return group.label;
  return categories.map((id) => categoryInfo(id).plural).join(' · ');
}
