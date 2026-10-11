import { categoryInfo } from '../config/product-categories';
import { Product, ProductVariant } from '../models/product';
import { PromoDiscount, PromoTarget, Promotion } from '../models/promotion';

/**
 * Regras das promoções em funções puras (a loja aplica, o backoffice valida e
 * mostra a prévia; o back repete tudo no preço do pedido).
 */

export type PromoStatus = 'no-ar' | 'agendada' | 'encerrada' | 'inativa' | 'esgotada';

export const PROMO_STATUS_LABELS: Record<PromoStatus, string> = {
  'no-ar': 'No ar',
  agendada: 'Agendada',
  encerrada: 'Encerrada',
  inativa: 'Inativa',
  esgotada: 'Limite atingido',
};

/** Situação hoje (`today` = `aaaa-mm-dd`). */
export function promoStatus(promo: Promotion, today: string): PromoStatus {
  if (!promo.active) return 'inativa';
  if (promo.endsOn && promo.endsOn < today) return 'encerrada';
  if (promo.unitLimit && promo.sold >= promo.unitLimit) return 'esgotada';
  if (promo.startsOn && promo.startsOn > today) return 'agendada';
  return 'no-ar';
}

/** Formato da variante: `frasco` ou `decant:N` (para alvo por formato). */
export function variantFormat(variant: ProductVariant): string {
  return variant.kind === 'decant' ? `decant:${variant.volumeMl ?? 0}` : 'frasco';
}

/** "Frasco", "Decants (todos)", "Decant 5 ml". */
export function formatLabel(format: string): string {
  if (format === 'frasco') return 'Frasco';
  if (format === 'decant') return 'Decants (todos os tamanhos)';
  return `Decant ${format.split(':')[1]} ml`;
}

export function targetMatches(
  target: PromoTarget,
  product: Product,
  variant: ProductVariant,
): boolean {
  switch (target.kind) {
    case 'itens':
      return target.skus.includes(variant.id);
    case 'categoria':
      return product.category === target.category;
    case 'marca':
      return product.brandName === target.brand;
    default:
      return target.format === 'decant'
        ? variant.kind === 'decant'
        : variantFormat(variant) === target.format;
  }
}

/** Preço com o desconto (2 casas). `null` = não fica mais barato (não aplica). */
export function discountedPrice(price: number, discount: PromoDiscount): number | null {
  const value =
    discount.kind === 'percent'
      ? price * (1 - discount.value / 100)
      : discount.kind === 'amount'
        ? price - discount.value
        : discount.value;
  const rounded = Math.round(value * 100) / 100;
  return rounded > 0 && rounded < price ? rounded : null;
}

/**
 * Melhor preço da variante entre as promoções NO AR (não acumulam: vale a de
 * maior desconto). `null` = sem promoção.
 */
export function bestPromo(
  product: Product,
  variant: ProductVariant,
  promos: readonly Promotion[],
  today: string,
): { price: number; promo: Promotion } | null {
  let best: { price: number; promo: Promotion } | null = null;
  for (const promo of promos) {
    if (promoStatus(promo, today) !== 'no-ar' || !targetMatches(promo.target, product, variant)) {
      continue;
    }
    const price = discountedPrice(variant.price, promo.discount);
    if (price != null && (!best || price < best.price)) best = { price, promo };
  }
  return best;
}

/** Produto com `promoPrice` preenchido pelas promoções (o que a loja recebe). */
export function applyPromotions(
  product: Product,
  promos: readonly Promotion[],
  today: string,
): Product {
  return {
    ...product,
    variants: product.variants.map((variant) => {
      const { promoPrice: _ignored, ...base } = variant;
      const best = bestPromo(product, base, promos, today);
      return best ? { ...base, promoPrice: best.price } : base;
    }),
  };
}

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** "-15%", "R$ 20,00 a menos", "Por R$ 5,99". */
export function discountLabel(discount: PromoDiscount): string {
  if (discount.kind === 'percent') return `-${discount.value}%`;
  if (discount.kind === 'amount') return `${brl(discount.value)} a menos`;
  return `Por ${brl(discount.value)}`;
}

/** "Categoria: Perfumes", "Marca: Lattafa", "Formato: Decant 5 ml", "3 itens". */
export function targetLabel(target: PromoTarget): string {
  switch (target.kind) {
    case 'itens':
      return `${target.skus.length} ${target.skus.length === 1 ? 'item escolhido' : 'itens escolhidos'}`;
    case 'categoria':
      return `Categoria: ${categoryInfo(target.category).plural}`;
    case 'marca':
      return `Marca: ${target.brand}`;
    default:
      return `Formato: ${formatLabel(target.format)}`;
  }
}

export const PROMO_NAME_MAX = 60;

/** Problemas da promoção (lista vazia = pode salvar). */
export function promotionProblems(promo: Omit<Promotion, 'id' | 'sold'>): string[] {
  const problems: string[] = [];
  const name = promo.name.trim();
  if (name.length < 3) problems.push('Dê um nome à promoção (mínimo 3 letras).');
  if (name.length > PROMO_NAME_MAX)
    problems.push(`Nome com no máximo ${PROMO_NAME_MAX} caracteres.`);
  const t = promo.target;
  if (t.kind === 'itens' && !t.skus.length) problems.push('Escolha pelo menos um item.');
  if (t.kind === 'categoria' && !t.category) problems.push('Escolha a categoria.');
  if (t.kind === 'marca' && !t.brand) problems.push('Escolha a marca.');
  if (t.kind === 'formato' && !t.format) problems.push('Escolha o formato.');
  const d = promo.discount;
  if (!Number.isFinite(d.value) || d.value <= 0) problems.push('Informe o desconto.');
  else if (d.kind === 'percent' && (d.value < 1 || d.value > 90 || !Number.isInteger(d.value))) {
    problems.push('Percentual entre 1% e 90% (número inteiro).');
  }
  if (promo.startsOn && promo.endsOn && promo.endsOn < promo.startsOn) {
    problems.push('A data final precisa ser igual ou depois da inicial.');
  }
  if (promo.unitLimit != null && (!Number.isInteger(promo.unitLimit) || promo.unitLimit < 1)) {
    problems.push('Limite de unidades: número inteiro maior que zero (ou deixe em branco).');
  }
  return problems;
}
