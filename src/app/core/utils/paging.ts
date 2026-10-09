/**
 * Página no formato do Spring Data (`Page<T>` serializado). O mock monta isso
 * em memória; na Fase 2 vem de `GET ...?page=0&size=20&sort=campo,desc`
 * (o back limita `size` a 100).
 */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  /** Página atual, começando em 0 (como no Spring). */
  number: number;
  size: number;
}

export const PAGE_SIZES = [20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

/** Recorta a lista; página fora do intervalo cai na última (ou na 0). */
export function pageOf<T>(list: readonly T[], page: number, size: number): Page<T> {
  const safeSize = Math.max(1, Math.floor(size) || DEFAULT_PAGE_SIZE);
  const totalPages = Math.ceil(list.length / safeSize);
  const number = Math.min(Math.max(0, Math.floor(page) || 0), Math.max(0, totalPages - 1));
  return {
    content: list.slice(number * safeSize, (number + 1) * safeSize),
    totalElements: list.length,
    totalPages,
    number,
    size: safeSize,
  };
}
