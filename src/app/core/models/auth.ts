export interface AuthUser {
  name: string;
  email: string;
  /** Pedido no cadastro; usado na nota fiscal e no pagamento. Contas antigas/Google podem não ter. */
  cpf?: string;
}

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; message: string };
