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
