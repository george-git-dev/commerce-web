export interface AuthUser {
  name: string;
  email: string;
  /** Pedido no cadastro; usado na nota fiscal e no pagamento. Contas antigas/Google podem não ter. */
  cpf?: string;
  /** Celular com DDD (opcional). Só em memória, como o CPF. */
  phone?: string;
}

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; message: string };
