/** Estoque mínimo quando o frasco/decant ainda não tem um definido. */
export const DEFAULT_MIN_STOCK = 3;

export type StockStatus = 'ok' | 'baixo' | 'zerado';

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  ok: 'OK',
  baixo: 'Baixo',
  zerado: 'Zerado',
};

/** Zerado = 0; Baixo = no mínimo ou abaixo; senão OK. */
export function stockStatus(stock: number, min: number): StockStatus {
  if (stock <= 0) return 'zerado';
  return stock <= min ? 'baixo' : 'ok';
}

export type StockDirection = 'entrada' | 'saida';

/**
 * Motivos de ajuste manual, por direção. Compra entra por "Entradas" (com
 * fornecedor e custo); venda e saldo inicial são automáticos. Envase: saída
 * do frasco aberto e entrada dos decants envasados.
 */
export const ADJUST_REASONS: Record<StockDirection, readonly string[]> = {
  entrada: ['Envase de decant', 'Devolução de cliente', 'Correção de inventário'],
  saida: ['Envase de decant', 'Perda/avaria', 'Uso interno/amostra', 'Correção de inventário'],
};

/** O que impede o ajuste (quantidade inteira > 0, motivo, saldo não negativo). */
export function adjustProblems(
  current: number,
  direction: StockDirection,
  quantity: number | string | null,
  reason: string,
): string[] {
  const problems: string[] = [];
  const qty = Number(quantity);
  if (quantity == null || `${quantity}`.trim() === '' || !Number.isInteger(qty) || qty <= 0) {
    problems.push('Informe a quantidade: inteiro maior que zero.');
  }
  if (!ADJUST_REASONS[direction].includes(reason)) problems.push('Escolha o motivo.');
  if (direction === 'saida' && qty > current) {
    problems.push(`Saída maior que o estoque atual (${current} un.).`);
  }
  return problems;
}

/** Mínimo: inteiro, zero ou mais. */
export function validMinimum(value: number | string | null): boolean {
  return (
    value != null &&
    `${value}`.trim() !== '' &&
    Number.isInteger(Number(value)) &&
    Number(value) >= 0
  );
}
