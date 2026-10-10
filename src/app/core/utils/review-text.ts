/**
 * Regras de texto das avaliações (funções puras, usadas na loja e no
 * backoffice; o back aplica as mesmas).
 */

/** "Maria Silva Souza" → "Maria S." (LGPD: nunca o nome completo na loja). */
export function reviewerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Cliente';
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  return parts.length > 1 ? `${first} ${parts.at(-1)!.charAt(0).toUpperCase()}.` : first;
}

export type ReviewFlag = 'link' | 'telefone' | 'e-mail';

export const REVIEW_FLAG_LABELS: Record<ReviewFlag, string> = {
  link: 'Tem link',
  telefone: 'Tem telefone',
  'e-mail': 'Tem e-mail',
};

/**
 * Sinais de spam ou de dado pessoal exposto no comentário. Só destaca para a
 * moderação; quem decide é a equipe.
 */
export function reviewFlags(text: string): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|br|io|shop|store)\b)/i.test(text)) {
    flags.push('link');
  }
  if (/(\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}/.test(text)) flags.push('telefone');
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) flags.push('e-mail');
  // E-mail também casa como "link" pelo domínio: mostra só o mais específico.
  return flags.includes('e-mail') ? flags.filter((flag) => flag !== 'link') : flags;
}

export const REPLY_MIN = 5;
export const REPLY_MAX = 500;

/** Resposta da loja: curta, só texto (sem `<` `>`), sem link. */
export function replyProblem(text: string): string | null {
  const value = text.trim();
  if (value.length < REPLY_MIN) return `Escreva pelo menos ${REPLY_MIN} caracteres.`;
  if (value.length > REPLY_MAX) return `No máximo ${REPLY_MAX} caracteres.`;
  if (/[<>]/.test(value)) return 'Sem os caracteres < e >.';
  if (reviewFlags(value).includes('link')) return 'A resposta não pode ter link.';
  return null;
}
