import { Role } from '../config/permissions';

/**
 * Contas FICTÍCIAS com entrega em mãos liberada (simula a flag que o admin liga
 * no backoffice). Para testar: entre com um destes e-mails e qualquer senha 8+.
 * Na Fase 2 some — a flag vem do back em `GET /me`.
 */
export const IN_HANDS_MOCK_EMAILS: readonly string[] = ['vizinho@email.com'];

/**
 * Equipe FICTÍCIA para testar o backoffice: além de `ROLE_CUSTOMER` (que todo
 * cadastro tem), estes e-mails ganham o perfil abaixo. Qualquer senha 8+.
 */
export const STAFF_MOCK: Readonly<Record<string, readonly Role[]>> = {
  'superadmin@email.com': ['ROLE_SUPER_ADMIN'],
  'admin@email.com': ['ROLE_ADMIN'],
  'viewer@email.com': ['ROLE_VIEWER'],
};

/**
 * Contas FICTÍCIAS criadas com "Continuar com Google" (sem senha na loja): a
 * ficha mostra "Entra com Google" e não oferece redefinir senha.
 */
export const GOOGLE_MOCK_EMAILS: readonly string[] = ['cliente.google@gmail.com'];

/**
 * Simula o provedor de e-mail FALHANDO para estes endereços (para testar o
 * plano B do link pelo WhatsApp). Na Fase 2 o status vem do back (fila de envio).
 */
export const EMAIL_FAILS_MOCK: readonly string[] = ['vizinho@email.com'];
