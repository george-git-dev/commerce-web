/** Valor de uma célula: texto, número (vira "1234,56") ou vazio. */
export type CsvValue = string | number | null | undefined;

/**
 * CSV para o Excel em português: separador `;`, BOM UTF-8 (acentos certos),
 * número com vírgula decimal e proteção contra fórmula — texto que começa com
 * = + - @ ganha um apóstrofo e vira só texto (CSV injection).
 */
export function toCsv(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  const cell = (value: CsvValue): string => {
    if (value == null) return '';
    if (typeof value === 'number') return String(value).replace('.', ',');
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return '﻿' + [header, ...rows].map((row) => row.map(cell).join(';')).join('\r\n');
}

/** Baixa o texto como arquivo (`nome-AAAA-MM-DD.csv`, data local). */
export function downloadCsv(name: string, csv: string): void {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${name}-${stamp}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
