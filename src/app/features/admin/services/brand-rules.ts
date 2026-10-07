import { normalizeName } from './product-rules';

export const BRAND_NAME_MAX = 40;

/** Nome da marca: obrigatório, até 40 caracteres e sem repetir outra (ignorando acento/caixa). */
export function brandProblems(name: string, otherNames: readonly string[]): string[] {
  const problems: string[] = [];
  const trimmed = name.trim();
  if (trimmed.length < 2) problems.push('Informe o nome da marca.');
  if (trimmed.length > BRAND_NAME_MAX) {
    problems.push(`Nome com no máximo ${BRAND_NAME_MAX} caracteres.`);
  }
  const key = normalizeName(trimmed);
  const same = otherNames.find((other) => normalizeName(other) === key);
  if (trimmed && same) problems.push(`Já existe a marca "${same}".`);
  return problems;
}
