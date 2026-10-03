import { computed, Injectable, signal } from '@angular/core';
import { AuthResult, AuthUser } from '../models/auth';

const STORAGE_KEY = 'nani.auth.mock';
export const MIN_PASSWORD_LENGTH = 8;

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

function storeUser(user: AuthUser | null): void {
  try {
    if (user) globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(user));
    else globalThis.localStorage?.removeItem(STORAGE_KEY);
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

  readonly user = this.state.asReadonly();
  readonly isLoggedIn = computed(() => this.state() !== null);

  login(email: string, password: string): AuthResult {
    const problem = this.credentialsProblem(email, password);
    if (problem) return { ok: false, message: problem };
    return this.start({ name: nameFromEmail(email.trim()), email: email.trim().toLowerCase() });
  }

  register(name: string, email: string, password: string): AuthResult {
    if (name.trim().length < 2) return { ok: false, message: 'Informe seu nome.' };
    const problem = this.credentialsProblem(email, password);
    if (problem) return { ok: false, message: problem };
    return this.start({ name: name.trim(), email: email.trim().toLowerCase() });
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Informe um e-mail válido.';
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    return null;
  }
}
