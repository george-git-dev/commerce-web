import { AffiliateDraft, AffiliateStatus } from '../models/affiliate';
import { isValidCnpj, isValidCpf, onlyDigits } from './br-format';
import { COUPON_CODE_RE } from './coupon-rules';

export const AFFILIATE_STATUS_LABELS: Record<AffiliateStatus, string> = {
  pendente: 'Em análise',
  aprovado: 'Aprovado',
  reprovado: 'Não aprovado',
};

/** Quanto tempo esperar para pedir de novo depois de não aprovado. */
export const REAPPLY_AFTER_DAYS = 30;

export const PITCH_MIN = 20;
export const PITCH_MAX = 300;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVP_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PixKeyKind = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';

/** Tipo da chave Pix (ou `null` se não é uma chave válida). */
export function pixKeyKind(raw: string): PixKeyKind | null {
  const value = raw.trim();
  if (EMAIL_RE.test(value)) return 'email';
  if (EVP_RE.test(value)) return 'aleatoria';
  const digits = onlyDigits(value);
  if (/^[\d.\-/\s()+]+$/.test(value)) {
    if (digits.length === 11 && isValidCpf(digits)) return 'cpf';
    if (digits.length === 14 && isValidCnpj(digits)) return 'cnpj';
    // Celular com DDD (com ou sem +55).
    const phone = digits.startsWith('55') && digits.length === 13 ? digits.slice(2) : digits;
    if (phone.length === 11 && phone[2] === '9') return 'telefone';
  }
  return null;
}

/** Chave Pix mascarada para tela ("***.982.247-**", "ma***@email.com"). */
export function maskPixKey(raw: string): string {
  const value = raw.trim();
  const kind = pixKeyKind(value);
  if (kind === 'email') {
    const [user, domain] = value.split('@');
    return `${user.slice(0, 2)}***@${domain}`;
  }
  if (kind === 'aleatoria') return `${value.slice(0, 4)}…${value.slice(-4)}`;
  const digits = onlyDigits(value);
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

/** Problemas do pedido de afiliação (lista vazia = pode enviar). */
export function affiliateDraftProblems(draft: AffiliateDraft, acceptedTerms: boolean): string[] {
  const problems: string[] = [];
  if (draft.profile.trim().length < 3) problems.push('Informe o @ ou o link do seu perfil.');
  const pitch = draft.pitch.trim().length;
  if (pitch < PITCH_MIN) problems.push(`Conte como vai divulgar (mínimo ${PITCH_MIN} caracteres).`);
  if (pitch > PITCH_MAX) problems.push(`No máximo ${PITCH_MAX} caracteres em "como vai divulgar".`);
  if (!pixKeyKind(draft.pixKey)) {
    problems.push('Chave Pix inválida (CPF, CNPJ, e-mail, celular ou chave aleatória).');
  }
  if (!acceptedTerms) problems.push('Para participar, aceite os termos do programa.');
  return problems;
}

/** Sugestão de cupom a partir do nome ("Júlia Souza" → "JULIA5"), sem repetir. */
export function suggestAffiliateCode(
  name: string,
  discountPercent: number,
  taken: readonly string[],
): string {
  const first =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .trim()
      .split(/\s+/)[0] || 'NANI';
  const base = `${first.slice(0, 14)}${discountPercent}`;
  if (!taken.includes(base)) return base;
  for (let n = 2; n < 100; n++) {
    const code = `${first.slice(0, 12)}${n}${discountPercent}`;
    if (!taken.includes(code) && COUPON_CODE_RE.test(code)) return code;
  }
  return `${base}${Date.now() % 1000}`;
}
