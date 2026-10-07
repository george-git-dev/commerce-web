import { ProductVariant } from '../../../core/models/product';

/** Limites das imagens do produto (mesmos que o back valida no upload — B3). */
export const IMAGE_RULES = {
  max: 10,
  maxBytes: 5 * 1024 * 1024,
  types: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

/** "Lattafa Asad Bourbon" → "lattafa-asad-bourbon" (sem acentos e símbolos). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Slug livre: se já existe, acrescenta -2, -3… */
export function uniqueSlug(base: string, taken: readonly string[]): string {
  let slug = base || 'produto';
  for (let n = 2; taken.includes(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** Problema de um arquivo de imagem (tipo ou tamanho), ou `null` se serve. */
export function imageProblem(file: { type: string; size: number }): string | null {
  if (!(IMAGE_RULES.types as readonly string[]).includes(file.type)) {
    return 'Use imagens JPG, PNG ou WEBP.';
  }
  if (file.size > IMAGE_RULES.maxBytes) return 'Cada imagem pode ter até 5 MB.';
  return null;
}

/**
 * Problemas das variantes (lista vazia = ok): pelo menos uma, no máximo um
 * frasco, SKU único na loja, preço > 0, promoção menor que o preço e
 * estoque inteiro ≥ 0. O back valida as mesmas regras (B3).
 */
export function variantProblems(
  variants: readonly ProductVariant[],
  skusInOtherProducts: readonly string[],
): string[] {
  const problems: string[] = [];
  if (!variants.length) problems.push('Cadastre pelo menos uma variante.');
  if (variants.filter((variant) => variant.kind === 'frasco').length > 1) {
    problems.push('Só pode haver um frasco por produto (decants à vontade).');
  }
  const skus = variants.map((variant) => variant.id.trim().toLowerCase());
  if (skus.some((sku) => !sku)) problems.push('Toda variante precisa de SKU.');
  if (new Set(skus).size !== skus.length) problems.push('Há SKUs repetidos neste produto.');
  if (skus.some((sku) => skusInOtherProducts.includes(sku))) {
    problems.push('Algum SKU já é usado por outro produto.');
  }
  if (variants.some((variant) => !(variant.price > 0))) {
    problems.push('Todo preço precisa ser maior que zero.');
  }
  if (
    variants.some((variant) => variant.promoPrice != null && variant.promoPrice >= variant.price)
  ) {
    problems.push('O preço promocional precisa ser menor que o preço cheio.');
  }
  if (variants.some((variant) => !Number.isInteger(variant.stock) || variant.stock < 0)) {
    problems.push('O estoque precisa ser um número inteiro, zero ou mais.');
  }
  return problems;
}

export const MIN_DESCRIPTION = 20;

/** O que o cadastro preencheu até agora (valores crus dos campos). */
export interface ProductDraft {
  brand: string;
  line: string;
  category: string;
  gender: string;
  /** Só perfume; '' = não escolheu ("Não informar" conta como escolha). */
  concentration: string;
  description: string;
  kitItems: string;
  bottle: {
    enabled: boolean;
    volumeMl: number | string | null;
    price: number | string | null;
    promoPrice?: number | string | null;
  };
  /** Estoque não entra aqui: só por compra/envase/ajuste (Estoque e compras). */
  decants: readonly { checked: boolean; price: number | string | null }[];
  families: readonly string[];
  occasions: readonly string[];
  notes: number;
  images: readonly string[];
  badge?: string;
}

/** Rascunho: só marca e linha (o resto pode ficar para depois). */
export function draftProblems(d: Pick<ProductDraft, 'brand' | 'line'>): string[] {
  return [
    ...(d.brand ? [] : ['Escolha a marca.']),
    ...(d.line ? [] : ['Escolha ou crie a linha.']),
  ];
}

type Field = number | string | null;
const filled = (value: Field) => value != null && `${value}`.trim() !== '';
/** Preço/volume: preenchido e maior que zero (negativo e zero não valem). */
const positive = (value: Field) => filled(value) && Number(value) > 0;

/** Promoção é opcional; se preenchida, maior que zero e menor que o preço. */
export function validPromo(promo: Field, price: Field): boolean {
  return !filled(promo) || (positive(promo) && Number(promo) < Number(price));
}

/**
 * Campos obrigatórios de cada etapa do cadastro (0 Dados, 1 Variantes,
 * 2 Perfil olfativo, 3 Imagens, 4 Vitrine — selo opcional). Não avança sem eles.
 * Tudo que vira filtro na loja é obrigatório (categoria, marca, gênero,
 * família, ocasião, preço); notas, só para perfume.
 */
export function requiredProblems(step: number, d: ProductDraft): string[] {
  const problems: string[] = step === 0 ? draftProblems(d) : [];
  const add = (missing: boolean, message: string) => missing && problems.push(message);
  switch (step) {
    case 0:
      add(!d.category, 'Escolha a categoria.');
      add(!d.gender, 'Escolha o gênero.');
      add(
        d.category === 'perfume' && !d.concentration,
        'Escolha a concentração (ou "Não informar").',
      );
      add(
        d.description.trim().length < MIN_DESCRIPTION,
        `Escreva a descrição (mínimo ${MIN_DESCRIPTION} caracteres).`,
      );
      add(d.category === 'kit' && !d.kitItems.trim(), 'Informe os itens do kit.');
      break;
    case 1: {
      const checked = d.decants.filter((size) => size.checked);
      add(
        !d.bottle.enabled && !checked.length,
        'Ative o frasco ou marque algum tamanho de decant.',
      );
      if (d.bottle.enabled) {
        add(!positive(d.bottle.volumeMl), 'Informe o volume do frasco (maior que zero).');
        add(!positive(d.bottle.price), 'Informe o preço do frasco (maior que zero).');
        add(
          !validPromo(d.bottle.promoPrice ?? null, d.bottle.price),
          'A promoção precisa ser maior que zero e menor que o preço.',
        );
      }
      add(
        checked.some((size) => !positive(size.price)),
        'Informe o preço de cada decant marcado (maior que zero).',
      );

      break;
    }
    case 2:
      add(!d.families.length, 'Escolha pelo menos uma família olfativa.');
      add(!d.occasions.length, 'Escolha a ocasião (dia, noite ou as duas).');
      add(
        d.category === 'perfume' && !d.notes,
        'Escolha pelo menos uma nota (topo, coração ou fundo).',
      );
      break;
    case 3:
      add(!d.images.length, 'Envie pelo menos uma imagem.');
      break;
    case 4: {
      const badge = normalizeName(d.badge ?? '');
      add(
        AUTOMATIC_BADGES.some((auto) => normalizeName(auto) === badge),
        'Mais vendido, Lançamento e Oferta a loja coloca sozinha — escolha outro selo.',
      );
      add(
        (d.badge ?? '').length > BADGE_MAX_LENGTH,
        `Selo com no máximo ${BADGE_MAX_LENGTH} caracteres.`,
      );
      break;
    }
  }
  return problems;
}

/** Tamanhos de decant oferecidos no cadastro (marque só os que vai vender). */
export const DECANT_SIZES_ML = [2, 3, 5, 10] as const;

/** Selos sugeridos no card da vitrine; dá para criar outros no cadastro. */
export const BADGE_OPTIONS = ['Exclusivo', 'Edição limitada'] as const;
/** Selos que a loja põe sozinha (vendas, data de cadastro, promoção). */
export const AUTOMATIC_BADGES = ['Mais vendido', 'Lançamento', 'Oferta'] as const;
export const BADGE_MAX_LENGTH = 20;

/** Nome comparável: sem acento, caixa, espaço ou símbolo ("Al-Haramain" = "al haramain"). */
export function normalizeName(text: string): string {
  return slugify(text).replace(/-/g, '');
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/**
 * Nome já existente igual ou parecido (até 2 letras de diferença, ou um contém
 * o outro) — para avisar antes de criar "Latafa" quando já existe "Lattafa".
 */
export function similarName(text: string, existing: readonly string[]): string | undefined {
  const value = normalizeName(text);
  if (!value) return undefined;
  return existing.find((name) => {
    const other = normalizeName(name);
    return (
      other === value ||
      distance(value, other) <= 2 ||
      (value.length >= 4 && (other.includes(value) || value.includes(other)))
    );
  });
}
