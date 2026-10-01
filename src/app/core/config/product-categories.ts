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
  return categories.map((id) => CATEGORY_LABELS[id].plural).join(' · ');
}
