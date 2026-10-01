import { VARIANT_KIND_LABELS } from '../config/fragrance';
import { Product, ProductVariant, VariantKind } from '../models/product';

/**
 * Regras de preço e disponibilidade, em funções puras. As telas usam estas
 * funções em vez de repetir a lógica. No back, viram métodos de domínio.
 */

/** Preço que o cliente paga: o promocional, se houver. */
export function effectivePrice(variant: ProductVariant): number {
  return variant.promoPrice ?? variant.price;
}

export function isInStock(variant: ProductVariant): boolean {
  return variant.stock > 0;
}

/** Algum tamanho do produto disponível? */
export function isAvailable(product: Product): boolean {
  return product.variants.some(isInStock);
}

/** Algum tamanho do produto com preço promocional? */
export function hasDeal(product: Product): boolean {
  return product.variants.some((variant) => variant.promoPrice !== undefined);
}

export function hasKind(product: Product, kind: VariantKind): boolean {
  return product.variants.some((variant) => variant.kind === kind);
}

/** Tipos que o produto tem, sempre na ordem frasco → decant. */
export function variantKinds(product: Product): VariantKind[] {
  return (['frasco', 'decant'] as const).filter((kind) => hasKind(product, kind));
}

/** Tamanhos de um tipo, do menor volume para o maior. */
export function variantsOfKind(product: Product, kind: VariantKind): ProductVariant[] {
  return product.variants
    .filter((variant) => variant.kind === kind)
    .sort((a, b) => (a.volumeMl ?? 0) - (b.volumeMl ?? 0));
}

/**
 * Tamanho sugerido: o mais barato entre os disponíveis. Se nenhum tiver
 * estoque, o mais barato de todos (para a tela mostrar preço e "Esgotado").
 */
export function defaultVariant(product: Product, kind?: VariantKind): ProductVariant | undefined {
  const candidates = kind
    ? product.variants.filter((variant) => variant.kind === kind)
    : product.variants;
  const inStock = candidates.filter(isInStock);
  const pool = inStock.length ? inStock : candidates;
  return [...pool].sort((a, b) => effectivePrice(a) - effectivePrice(b))[0];
}

/** Menor preço do produto (ou de um tipo): o valor do "a partir de". */
export function lowestPrice(product: Product, kind?: VariantKind): number {
  const variant = defaultVariant(product, kind);
  return variant ? effectivePrice(variant) : 0;
}

/**
 * Tipo mostrado na vitrine (cards): frasco, se houver. O decant só aparece no
 * card quando o cliente filtra por ele (menu "Decants", pós-MVP).
 */
export function primaryKind(product: Product): VariantKind | undefined {
  return variantKinds(product)[0];
}

/**
 * Os tamanhos (de um tipo) têm preços diferentes? Se sim, mostra "a partir de".
 * Considera só os disponíveis — tamanho esgotado não conta como "a partir de".
 */
export function hasPriceRange(product: Product, kind?: VariantKind): boolean {
  const variants = kind
    ? product.variants.filter((variant) => variant.kind === kind)
    : product.variants;
  const inStock = variants.filter(isInStock);
  return new Set((inStock.length ? inStock : variants).map(effectivePrice)).size > 1;
}

/** Desconto em % do tamanho, ou `null` se não estiver em promoção. */
export function discountPercent(variant: ProductVariant): number | null {
  return variant.promoPrice !== undefined
    ? Math.round((1 - variant.promoPrice / variant.price) * 100)
    : null;
}

/** "Frasco 100 ml", "Decant 5 ml", "Kit". */
export function variantLabel(product: Product, variant: ProductVariant): string {
  if (variant.kind === 'frasco' && product.category === 'kit') return 'Kit';
  const volume = variant.volumeMl ? ` ${variant.volumeMl} ml` : '';
  return `${VARIANT_KIND_LABELS[variant.kind]}${volume}`;
}

/** Linha da página de produto: "Frasco original lacrado · 100 ml", "Kit original lacrado". */
export function sealedLabel(product: Product, variant: ProductVariant): string {
  if (product.category === 'kit') return 'Kit original lacrado';
  const volume = variant.volumeMl ? ` · ${variant.volumeMl} ml` : '';
  return `Frasco original lacrado${volume}`;
}
