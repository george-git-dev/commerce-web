/** Formatação e validação de dados brasileiros usados no checkout. */

export function onlyDigits(value: string, max = Infinity): string {
  return value.replace(/\D/g, '').slice(0, max);
}

export function formatCpf(value: string): string {
  const d = onlyDigits(value, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

/** CPF com os dois dígitos verificadores corretos (e não "111.111.111-11"). */
export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(d[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(d[9]) && digit(10) === Number(d[10]);
}

/** CNPJ com os dois dígitos verificadores corretos. */
export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const digit = (length: number) => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, weight, i) => acc + Number(d[i]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return digit(12) === Number(d[12]) && digit(13) === Number(d[13]);
}

/** "CPF ou CNPJ" no mesmo campo: formata conforme a quantidade de dígitos. */
export function formatDocument(value: string): string {
  const d = onlyDigits(value, 14);
  if (d.length <= 11) return formatCpf(d);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function isValidDocument(value: string): boolean {
  return onlyDigits(value).length > 11 ? isValidCnpj(value) : isValidCpf(value);
}

export function formatCardNumber(value: string): string {
  return onlyDigits(value, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** Algoritmo de Luhn (dígito verificador de cartões). */
export function isValidCardNumber(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

/** Bandeira pelo começo do número — só para exibir; quem decide é o gateway. */
export function cardBrand(value: string): string | null {
  const d = onlyDigits(value);
  const elo = /^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/;
  if (elo.test(d)) return 'Elo';
  if (/^(606282|3841)/.test(d)) return 'Hipercard';
  if (/^3[47]/.test(d)) return 'American Express';
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
  return null;
}

export function formatExpiry(value: string): string {
  const d = onlyDigits(value, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** "MM/AA" de um mês válido, sem estar vencido. */
export function isValidExpiry(value: string, now = new Date()): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const lastDay = new Date(year, month, 0, 23, 59, 59);
  return lastDay >= now;
}

/** Telefone com DDD: "(11) 98765-4321" (celular) ou "(11) 3456-7890" (fixo). */
export function formatPhone(value: string): string {
  const d = onlyDigits(value, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  // Celular (3º dígito 9) já nasce no formato 5+4; fixo, 4+4.
  const split = d[2] === '9' ? 7 : 6;
  const tail = d.length > split ? `-${d.slice(split)}` : '';
  return `(${d.slice(0, 2)}) ${d.slice(2, split)}${tail}`;
}

/** DDD válido (11–99) + 8 dígitos (fixo) ou 9 começando com 9 (celular). */
export function isValidPhone(value: string): boolean {
  const d = onlyDigits(value);
  if (!/^[1-9][1-9]/.test(d)) return false;
  return d.length === 10 || (d.length === 11 && d[2] === '9');
}

/** "529.982.247-25" → "***.982.247-**": só o meio aparece na tela. */
export function maskCpf(value: string): string {
  const d = onlyDigits(value, 11);
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : '';
}
