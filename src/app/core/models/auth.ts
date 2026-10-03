export interface AuthUser {
  name: string;
  email: string;
}

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; message: string };
