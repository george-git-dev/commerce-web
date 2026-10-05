import { computed, Injectable, signal } from '@angular/core';
import { ActionResult, AuthResult, AuthUser } from '../models/auth';
import { isValidCpf, isValidPhone } from '../utils/br-format';

const STORAGE_KEY = 'nani.auth.mock';
export const MIN_PASSWORD_LENGTH = 8;
/** Validade do link de redefinição de senha. */
export const RESET_LINK_MINUTES = 30;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lê a sessão salva; navegador sem storage (aba anônima, SSR) = deslogado. */
function readStoredUser(): AuthUser | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<AuthUser>) : null;
    return parsed?.email && parsed.name ? { name: parsed.name, email: parsed.email } : null;
  } catch {
    return null;
  }
}

/** Guarda só nome e e-mail — CPF e senha nunca vão para o navegador. */
function storeUser(user: AuthUser | null): void {
  try {
    if (!user) {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
      return;
    }
    const stored = { name: user.name, email: user.email };
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Sem storage disponível: a sessão vale só até recarregar a página.
  }
}

/** "maria.silva@x.com" → "Maria" (nome provisório quando só há e-mail). */
function nameFromEmail(email: string): string {
  const first = email.split('@')[0].split(/[._-]/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * Autenticação SIMULADA (dívida técnica até a Fase 2 / B4): aceita qualquer e-mail
 * válido com senha de 8+ caracteres e guarda só nome e e-mail no navegador —
 * nunca a senha. Na Fase 2 vira `POST /auth/login` e `POST /auth/register`, com
 * token JWT (de preferência em cookie httpOnly) e as regras do portão de segurança
 * (BCrypt, limite de tentativas, recuperação de senha).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly state = signal<AuthUser | null>(readStoredUser());
  /** Links de redefinição de senha ainda válidos (só no mock; no back ficam no banco). */
  private readonly resetLinks = new Map<string, { email: string; expiresAt: number }>();

  readonly user = this.state.asReadonly();
  readonly isLoggedIn = computed(() => this.state() !== null);

  login(email: string, password: string): AuthResult {
    const problem = this.credentialsProblem(email, password);
    if (problem) return { ok: false, message: problem };
    return this.start({ name: nameFromEmail(email.trim()), email: email.trim().toLowerCase() });
  }

  register(name: string, email: string, cpf: string, password: string): AuthResult {
    if (name.trim().length < 2) return { ok: false, message: 'Informe seu nome.' };
    if (!isValidCpf(cpf)) return { ok: false, message: 'Informe um CPF válido.' };
    const problem = this.credentialsProblem(email, password);
    if (problem) return { ok: false, message: problem };
    return this.start({ name: name.trim(), email: email.trim().toLowerCase(), cpf });
  }

  /**
   * Completa o cadastro de quem ainda não tem CPF (conta antiga ou Google).
   * Fase 2: `PATCH /me` — o CPF fica só no back; o front recebe mascarado.
   */
  completeCpf(cpf: string): AuthResult {
    const user = this.state();
    if (!user) return { ok: false, message: 'Entre na sua conta.' };
    if (!isValidCpf(cpf)) return { ok: false, message: 'Informe um CPF válido.' };
    return this.start({ ...user, cpf });
  }

  /**
   * Minha conta → Dados pessoais. E-mail não muda aqui (no back exige confirmar o
   * novo endereço). Fase 2: `PATCH /me`.
   */
  updateProfile(name: string, phone: string): AuthResult {
    const user = this.state();
    if (!user) return { ok: false, message: 'Entre na sua conta.' };
    if (name.trim().length < 2) return { ok: false, message: 'Informe seu nome.' };
    if (phone && !isValidPhone(phone)) return { ok: false, message: 'Informe um celular válido.' };
    return this.start({ ...user, name: name.trim(), phone: phone || undefined });
  }

  /**
   * Troca de senha SIMULADA: não há senha guardada para conferir a atual, então
   * só valida o formato. Fase 2: `POST /me/password` — o back confere a atual
   * (BCrypt), aplica a política de senha e encerra as outras sessões.
   */
  changePassword(current: string, next: string): AuthResult {
    const user = this.state();
    if (!user) return { ok: false, message: 'Entre na sua conta.' };
    if (current.length < MIN_PASSWORD_LENGTH)
      return { ok: false, message: 'Senha atual incorreta.' };
    if (next.length < MIN_PASSWORD_LENGTH) {
      return {
        ok: false,
        message: `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      };
    }
    if (next === current) {
      return { ok: false, message: 'A nova senha precisa ser diferente da atual.' };
    }
    return { ok: true, user };
  }

  /**
   * "Esqueci minha senha" SIMULADO. Cria um link de uso único que vale
   * ${RESET_LINK_MINUTES} minutos e devolve o token só para a tela de
   * demonstração (aqui não há e-mail). A tela mostra a MESMA mensagem exista ou
   * não a conta, para não revelar quem é cliente. Fase 2 (B4):
   * `POST /auth/password-reset` → o back guarda só o hash do token, envia o link
   * por e-mail e limita pedidos por IP/e-mail; a resposta não traz o token.
   */
  requestPasswordReset(email: string): string | null {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) return null;
    const token = globalThis.crypto.randomUUID();
    this.resetLinks.set(token, {
      email: normalized,
      expiresAt: Date.now() + RESET_LINK_MINUTES * 60_000,
    });
    return token;
  }

  /** O link ainda serve? (A tela de nova senha confere antes de mostrar o formulário.) */
  isResetLinkValid(token: string | null): boolean {
    const link = token ? this.resetLinks.get(token) : undefined;
    return !!link && link.expiresAt > Date.now();
  }

  /**
   * Define a nova senha pelo link. Não entra na conta: o cliente faz login com a
   * senha nova. Fase 2: `POST /auth/password-reset/confirm` — o back invalida o
   * token e encerra as sessões abertas.
   */
  resetPassword(token: string | null, password: string): ActionResult {
    if (!token || !this.isResetLinkValid(token)) {
      return { ok: false, message: 'Este link expirou ou já foi usado. Peça um novo.' };
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return {
        ok: false,
        message: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      };
    }
    this.resetLinks.delete(token);
    return { ok: true };
  }

  /**
   * "Continuar com Google" SIMULADO: entra com uma conta Google fictícia.
   * Fase 2: Google Identity Services no front (o próprio Google desenha o botão
   * e devolve um ID token) → `POST /auth/google` → o back valida o token com o
   * Google (assinatura, `aud` = nosso client ID, expiração), cria/encontra o
   * cliente pelo e-mail verificado e emite o nosso JWT. O front nunca confia no
   * token sozinho.
   */
  loginWithGoogle(): AuthResult {
    return this.start({ name: 'Cliente Google', email: 'cliente.google@gmail.com' });
  }

  logout(): void {
    this.state.set(null);
    storeUser(null);
  }

  private start(user: AuthUser): AuthResult {
    this.state.set(user);
    storeUser(user);
    return { ok: true, user };
  }

  private credentialsProblem(email: string, password: string): string | null {
    if (!EMAIL_PATTERN.test(email.trim())) return 'Informe um e-mail válido.';
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    return null;
  }
}
